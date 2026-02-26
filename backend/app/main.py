from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.websocket.manager import ConnectionManager
from app.routes.compiler import execute_python

app = FastAPI(title="CodeRoom API 🚀")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = ConnectionManager()

# ---------------- HOME ----------------

@app.get("/")
def home():
    return {"message": "CodeRoom Backend Running 🚀"}

# ---------------- RUN (NORMAL RUN BUTTON) ----------------

@app.post("/run")
async def run_code(payload: dict):
    code = payload.get("code")
    user_input = payload.get("input", "")

    output = execute_python(code, user_input)
    return {"output": output}

# ---------------- SUBMIT (HIDDEN TESTCASES) ----------------

@app.post("/submit")
async def submit_code(payload: dict):
    code = payload.get("code")

    # Example hidden testcases
    testcases = [
        ("10", "30"),
        ("7", "12"),
        ("1", "0"),
        ("20", "110")
    ]

    for input_data, expected_output in testcases:
        result = execute_python(code, input_data)

        if result == "TIMEOUT":
            return {"verdict": "Time Limit Exceeded ⏱"}

        if result.strip() != expected_output.strip():
            return {
                "verdict": "Wrong Answer ❌",
                "failed_input": input_data,
                "expected": expected_output,
                "got": result
            }

    return {"verdict": "Accepted ✅"}

# ---------------- WEBSOCKET ----------------

@app.websocket("/ws/{room}/{username}")
async def websocket_endpoint(websocket: WebSocket, room: str, username: str):
    await manager.connect(websocket, room, username)

    try:
        await manager.broadcast(f"🔵 {username} joined the room", room)

        while True:
            data = await websocket.receive_text()

            if data.startswith("__PROBLEM__:"):
                host = manager.get_host(room)
                if username == host:
                    problem = data.replace("__PROBLEM__:", "")
                    await manager.update_problem(room, problem)
            else:
                await manager.broadcast(data, room)

    except WebSocketDisconnect:
        manager.disconnect(websocket, room)
        await manager.broadcast(f"🔴 {username} left the room", room)
        await manager.broadcast_users(room)