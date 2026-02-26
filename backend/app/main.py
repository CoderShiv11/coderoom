from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import tempfile
import os
from typing import Dict, List

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://coderoom-dusky.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rooms: Dict[str, List[WebSocket]] = {}
online_users: Dict[str, int] = {}
room_problems: Dict[str, dict] = {}


class CodeRequest(BaseModel):
    code: str


class ProblemRequest(BaseModel):
    title: str
    description: str
    example: str


@app.get("/")
def root():
    return {"message": "CodeRoom Backend Running 🚀"}


@app.post("/run")
def run_code(request: CodeRequest):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".py", mode="w", encoding="utf-8") as temp:
            temp.write(request.code)
            temp_path = temp.name

        result = subprocess.run(
            ["python", temp_path],
            capture_output=True,
            text=True,
            timeout=5
        )

        os.unlink(temp_path)

        output = result.stdout if result.stdout else result.stderr
        return {"output": output}

    except Exception as e:
        return {"output": str(e)}


# 🔥 Admin sets problem
@app.post("/set-problem/{room}")
def set_problem(room: str, problem: ProblemRequest):
    room_problems[room] = {
        "title": problem.title,
        "description": problem.description,
        "example": problem.example,
    }
    return {"message": "Problem set successfully"}


# 🔥 Get problem
@app.get("/get-problem/{room}")
def get_problem(room: str):
    return room_problems.get(room, {})


@app.websocket("/ws/{room}/{username}")
async def websocket_endpoint(websocket: WebSocket, room: str, username: str):
    await websocket.accept()

    if room not in rooms:
        rooms[room] = []
        online_users[room] = 0

    rooms[room].append(websocket)
    online_users[room] += 1

    for connection in rooms[room]:
        await connection.send_json({
            "type": "online",
            "count": online_users[room]
        })

    try:
        while True:
            data = await websocket.receive_json()

            if data.get("type") == "chat":
                for connection in rooms[room]:
                    await connection.send_json({
                        "type": "chat",
                        "user": username,
                        "message": data.get("message"),
                    })

    except WebSocketDisconnect:
        rooms[room].remove(websocket)
        online_users[room] -= 1

        for connection in rooms[room]:
            await connection.send_json({
                "type": "online",
                "count": online_users[room]
            })