from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import asyncio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_USERS = 10

rooms = {}
room_passwords = {}
room_scores = {}
room_problems = {}
room_timer_running = {}
room_time = {}
room_admin = {}

# ========================= WEBSOCKET =========================
@app.websocket("/ws/{room}/{username}/{password}/{admin}")
async def websocket_endpoint(websocket: WebSocket, room: str, username: str, password: str, admin: str):

    is_admin = admin == "true"

    # ROOM NOT EXIST
    if room not in rooms:
        if not is_admin:
            await websocket.accept()
            await websocket.send_json({"type": "room_not_found"})
            await websocket.close()
            return

        # Create room
        rooms[room] = []
        room_scores[room] = {}
        room_timer_running[room] = False
        room_time[room] = 0
        room_admin[room] = username
        room_passwords[room] = password

    else:
        # Validate password
        if room_passwords.get(room) != password:
            await websocket.accept()
            await websocket.send_json({"type": "wrong_password"})
            await websocket.close()
            return

    # Limit users
    if len(rooms[room]) >= MAX_USERS:
        await websocket.accept()
        await websocket.send_json({"type": "room_full"})
        await websocket.close()
        return

    await websocket.accept()

    rooms[room].append(websocket)
    room_scores[room][username] = 0

    await broadcast_online(room)
    await broadcast_timer(room)
    await broadcast_leaderboard(room)

    try:
        while True:
            data = await websocket.receive_json()

            if data["type"] == "chat":
                await broadcast_chat(room, username, data["message"])

            if data["type"] == "submit":
                correct = check_solution(room, data["code"])

                if correct:
                    room_scores[room][username] += 10

                await broadcast_leaderboard(room)

            if username == room_admin[room]:

                if data["type"] == "start_timer":
                    room_timer_running[room] = True

                if data["type"] == "stop_timer":
                    room_timer_running[room] = False

                if data["type"] == "end_room":
                    await broadcast_end(room)
                    return

    except WebSocketDisconnect:

        rooms[room].remove(websocket)
        room_scores[room].pop(username, None)

        if len(rooms[room]) == 0:
            delete_room(room)
            return

        await broadcast_online(room)
        await broadcast_leaderboard(room)


# ========================= TIMER LOOP =========================
async def timer_loop():
    while True:
        for room in list(rooms.keys()):
            if room_timer_running.get(room):
                room_time[room] += 1
                await broadcast_timer(room)
        await asyncio.sleep(1)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(timer_loop())


# ========================= HELPERS =========================
def delete_room(room):
    rooms.pop(room, None)
    room_passwords.pop(room, None)
    room_scores.pop(room, None)
    room_timer_running.pop(room, None)
    room_time.pop(room, None)
    room_admin.pop(room, None)
    room_problems.pop(room, None)


def check_solution(room, code):
    if room not in room_problems:
        return False

    expected = room_problems[room].get("answer", "").strip()

    try:
        result = subprocess.run(
            ["python", "-c", code],
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.stdout.strip() == expected
    except:
        return False


async def broadcast_chat(room, username, message):
    for connection in rooms[room]:
        await connection.send_json({
            "type": "chat",
            "user": username,
            "message": message
        })


async def broadcast_online(room):
    for connection in rooms[room]:
        await connection.send_json({
            "type": "online",
            "count": len(rooms[room])
        })


async def broadcast_leaderboard(room):
    leaderboard = sorted(
        room_scores[room].items(),
        key=lambda x: x[1],
        reverse=True
    )
    for connection in rooms[room]:
        await connection.send_json({
            "type": "leaderboard",
            "data": leaderboard
        })


async def broadcast_timer(room):
    for connection in rooms[room]:
        await connection.send_json({
            "type": "timer",
            "time": room_time[room]
        })


async def broadcast_end(room):
    for connection in rooms[room]:
        await connection.send_json({"type": "room_ended"})
    delete_room(room)


# ========================= PROBLEM API =========================
class Problem(BaseModel):
    content: str
    answer: str

@app.post("/set-problem/{room}")
def set_problem(room: str, problem: Problem):
    room_problems[room] = {
        "content": problem.content,
        "answer": problem.answer
    }
    return {"message": "Problem saved"}

@app.get("/get-problem/{room}")
def get_problem(room: str):
    return room_problems.get(room, {})


# ========================= RUN CODE =========================
class Code(BaseModel):
    code: str

@app.post("/run")
def run_code(data: Code):
    try:
        result = subprocess.run(
            ["python", "-c", data.code],
            capture_output=True,
            text=True,
            timeout=5
        )
        return {"output": result.stdout or result.stderr}
    except Exception as e:
        return {"output": str(e)}