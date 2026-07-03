from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json

app = FastAPI(title="Openband Collaboration Service")

class ConnectionManager:
    def __init__(self):
        # Mapeia ID do projeto -> Lista de WebSockets ativos
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, room_id: str, websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)

    def disconnect(self, room_id: str, websocket: WebSocket):
        if room_id in self.active_connections:
            self.active_connections[room_id].remove(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]

    async def broadcast_to_room(self, room_id: str, message: dict, sender: WebSocket):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                # Não reenvia para quem enviou a alteração
                if connection != sender:
                    await connection.send_text(json.dumps(message))

manager = ConnectionManager()

@app.websocket("/ws/project/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(room_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            # Retransmite alterações de áudio/cifras em tempo real para o resto da sala
            await manager.broadcast_to_room(room_id, payload, sender=websocket)
    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "collaboration"}
