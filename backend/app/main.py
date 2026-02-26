from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess

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


# -------------------------
# WebSocket
# -------------------------
@app.websocket("/ws/{room}/{username}")
async def websocket_endpoint(websocket: WebSocket, room: str, username: str):
    await websocket.accept()

    if room not in rooms:
        rooms[room] = []

    rooms[room].append(websocket)

    # Send online count
    await broadcast_online(room)

    try:
        while True:
            data = await websocket.receive_json()

            if data["type"] == "chat":
                await broadcast_chat(room, username, data["message"])

            if data["type"] == "submit":
                submission = {
                    "user": username,
                    "code": data["code"]
                }

                if room not in room_submissions:
                    room_submissions[room] = []

                room_submissions[room].append(submission)

                await broadcast_submission(room, submission)

    except WebSocketDisconnect:
        rooms[room].remove(websocket)
        await broadcast_online(room)


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


# -------------------------
# Problem APIs
# -------------------------
class Problem(BaseModel):
    content: str


@app.post("/set-problem/{room}")
def set_problem(room: str, problem: Problem):
    room_problems[room] = problem.content
    return {"message": "Problem set"}


@app.get("/get-problem/{room}")
def get_problem(room: str):
    return {"content": room_problems.get(room, "")}


@app.delete("/delete-problem/{room}")
def delete_problem(room: str):
    if room in room_problems:
        del room_problems[room]
    return {"message": "Problem deleted"}


# -------------------------
# Run Code
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