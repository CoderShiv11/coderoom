from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import time

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rooms = {}
room_problems = {}
room_submissions = {}
room_scores = {}
room_start_time = {}


# -------------------------
# WEBSOCKET
# -------------------------
@app.websocket("/ws/{room}/{username}")
async def websocket_endpoint(websocket: WebSocket, room: str, username: str):
    await websocket.accept()

    if room not in rooms:
        rooms[room] = []
        room_scores[room] = {}

    rooms[room].append(websocket)
    room_scores[room][username] = 0

    await broadcast_online(room)
    await broadcast_leaderboard(room)

    try:
        while True:
            data = await websocket.receive_json()

            if data["type"] == "chat":
                await broadcast_chat(room, username, data["message"])

            if data["type"] == "submit":
                code = data["code"]
                correct = check_solution(room, code)

                if correct:
                    room_scores[room][username] += 10

                submission = {
                    "user": username,
                    "code": code,
                    "correct": correct
                }

                if room not in room_submissions:
                    room_submissions[room] = []

                room_submissions[room].append(submission)

                await broadcast_submission(room, submission)
                await broadcast_leaderboard(room)

    except WebSocketDisconnect:
        rooms[room].remove(websocket)
        await broadcast_online(room)


# -------------------------
# HELPERS
# -------------------------
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
        output = result.stdout.strip()
        return output == expected
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
    count = len(rooms[room])
    for connection in rooms[room]:
        await connection.send_json({
            "type": "online",
            "count": count
        })


async def broadcast_submission(room, submission):
    for connection in rooms[room]:
        await connection.send_json({
            "type": "submission",
            "data": submission
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


# -------------------------
# PROBLEM APIs
# -------------------------
class Problem(BaseModel):
    content: str
    answer: str


@app.post("/set-problem/{room}")
def set_problem(room: str, problem: Problem):
    room_problems[room] = {
        "content": problem.content,
        "answer": problem.answer
    }
    room_start_time[room] = time.time()
    return {"message": "Problem set"}


@app.get("/get-problem/{room}")
def get_problem(room: str):
    return room_problems.get(room, {})


@app.delete("/delete-problem/{room}")
def delete_problem(room: str):
    if room in room_problems:
        del room_problems[room]
    return {"message": "Deleted"}


# -------------------------
# RUN CODE
# -------------------------
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