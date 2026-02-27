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
room_timer_running = {}
room_time = {}
room_admin = {}
room_questions = {}

# ================= NORMALIZE FUNCTION =================
def normalize_output(text):
    return "\n".join(
        line.strip()
        for line in text.strip().replace("\r\n", "\n").split("\n")
        if line.strip() != ""
    )

# ================= WEBSOCKET =================
@app.websocket("/ws/{room}/{username}/{password}/{admin}")
async def websocket_endpoint(websocket: WebSocket, room: str, username: str, password: str, admin: str):

    room = room.strip().lower()
    username = username.strip()
    password = password.strip()
    is_admin = admin == "true"

    if room not in rooms:
        if not is_admin:
            await websocket.accept()
            await websocket.send_json({"type": "room_not_found"})
            await websocket.close()
            return

        rooms[room] = []
        room_scores[room] = {}
        room_timer_running[room] = False
        room_time[room] = 0
        room_admin[room] = username
        room_passwords[room] = password
        room_questions[room] = {
            "questions": [],
            "current_index": 0
        }

    else:
        if room_passwords.get(room) != password:
            await websocket.accept()
            await websocket.send_json({"type": "wrong_password"})
            await websocket.close()
            return

    if len(rooms[room]) >= MAX_USERS:
        await websocket.accept()
        await websocket.send_json({"type": "room_full"})
        await websocket.close()
        return

    await websocket.accept()
    rooms[room].append(websocket)

    if username not in room_scores[room]:
        room_scores[room][username] = 0

    await broadcast_online(room)
    await broadcast_leaderboard(room)
    await broadcast_timer(room)
    await broadcast_question(room)

    try:
        while True:
            data = await websocket.receive_json()

            if data["type"] == "chat":
                await broadcast_chat(room, username, data["message"])

            if data["type"] == "submit":
                correct = check_solution(
                    room,
                    data.get("code", ""),
                    data.get("user_input", "")
                )

                if correct:
                    room_scores[room][username] += 10

                await broadcast_leaderboard(room)

            if username == room_admin[room]:

                if data["type"] == "add_question":
                    room_questions[room]["questions"].append({
                        "content": data["content"],
                        "answer": data["answer"]
                    })
                    await broadcast_question(room)

                if data["type"] == "next_question":
                    if room_questions[room]["current_index"] < len(room_questions[room]["questions"]) - 1:
                        room_questions[room]["current_index"] += 1
                        await broadcast_question(room)

                if data["type"] == "start_timer":
                    room_timer_running[room] = True

                if data["type"] == "stop_timer":
                    room_timer_running[room] = False

                if data["type"] == "end_room":
                    await broadcast_end(room)
                    return

    except WebSocketDisconnect:

        rooms[room].remove(websocket)

        if len(rooms[room]) == 0:
            delete_room(room)
            return

        await broadcast_online(room)
        await broadcast_leaderboard(room)

# ================= CHECK SOLUTION =================
def check_solution(room, code, user_input):
    questions = room_questions[room]["questions"]
    index = room_questions[room]["current_index"]

    if not questions:
        return False

    expected = normalize_output(questions[index]["answer"])

    try:
        result = subprocess.run(
            ["python", "-c", code],
            input=user_input,
            capture_output=True,
            text=True,
            timeout=5
        )

        actual = normalize_output(result.stdout)

        return actual == expected

    except:
        return False

# ================= BROADCAST =================
async def broadcast_chat(room, username, message):
    for conn in rooms[room]:
        await conn.send_json({"type": "chat", "user": username, "message": message})

async def broadcast_online(room):
    for conn in rooms[room]:
        await conn.send_json({"type": "online", "count": len(rooms[room])})

async def broadcast_leaderboard(room):
    leaderboard = sorted(room_scores[room].items(), key=lambda x: x[1], reverse=True)
    for conn in rooms[room]:
        await conn.send_json({"type": "leaderboard", "data": leaderboard})

async def broadcast_timer(room):
    for conn in rooms[room]:
        await conn.send_json({"type": "timer", "time": room_time[room]})

async def broadcast_question(room):
    questions = room_questions[room]["questions"]
    index = room_questions[room]["current_index"]

    if questions:
        content = questions[index]["content"]
    else:
        content = "No question added."

    for conn in rooms[room]:
        await conn.send_json({
            "type": "question",
            "content": content,
            "index": index + 1,
            "total": len(questions)
        })

async def broadcast_end(room):
    for conn in rooms[room]:
        await conn.send_json({"type": "room_ended"})
    delete_room(room)

def delete_room(room):
    rooms.pop(room, None)
    room_passwords.pop(room, None)
    room_scores.pop(room, None)
    room_timer_running.pop(room, None)
    room_time.pop(room, None)
    room_admin.pop(room, None)
    room_questions.pop(room, None)

# ================= RUN =================
class Code(BaseModel):
    code: str
    user_input: str = ""

@app.post("/run")
def run_code(data: Code):
    try:
        result = subprocess.run(
            ["python", "-c", data.code],
            input=data.user_input,
            capture_output=True,
            text=True,
            timeout=5
        )
        return {"output": result.stdout or result.stderr}
    except Exception as e:
        return {"output": str(e)}