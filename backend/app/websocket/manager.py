from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.rooms = {}
        self.problems = {}

    async def connect(self, websocket: WebSocket, room: str, username: str):
        await websocket.accept()

        if room not in self.rooms:
            self.rooms[room] = []
            self.problems[room] = ""

        self.rooms[room].append((websocket, username))
        await self.broadcast_users(room)

    def disconnect(self, websocket: WebSocket, room: str):
        self.rooms[room] = [
            (ws, user) for ws, user in self.rooms[room] if ws != websocket
        ]

    async def broadcast(self, message: str, room: str):
        for ws, _ in self.rooms[room]:
            await ws.send_text(message)

    async def broadcast_users(self, room: str):
        users = ",".join([user for _, user in self.rooms[room]])
        for ws, _ in self.rooms[room]:
            await ws.send_text(f"__USERS__:{users}")

    async def update_problem(self, room: str, problem: str):
        self.problems[room] = problem
        for ws, _ in self.rooms[room]:
            await ws.send_text(f"__PROBLEM__:{problem}")

    def get_host(self, room: str):
        if room in self.rooms and len(self.rooms[room]) > 0:
            return self.rooms[room][0][1]
        return None