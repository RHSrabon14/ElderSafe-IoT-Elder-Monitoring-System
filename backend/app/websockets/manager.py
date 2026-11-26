from typing import List, Protocol


class WebSocket(Protocol):
    async def accept(self) -> None: ...

    async def send_json(self, data: dict) -> None: ...

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        # Send the message to all connected browsers
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                # If a connection is dead, we will ignore it
                pass

manager = ConnectionManager()