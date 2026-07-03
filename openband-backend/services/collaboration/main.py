from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import os
import redis

app = FastAPI(title="Openband Collaboration Service")

# Em ambiente local/offline, o REDIS_URL apontará para localhost ou para o service name do Docker
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

try:
    redis_client = redis.StrictRedis.from_url(REDIS_URL, decode_responses=True)
except Exception as e:
    print(f"Aviso: Redis não disponível ({e}). Rodando em modo memória.")
    redis_client = None

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, room_id: str, websocket: WebSocket):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)

        # Envia estado inicial da sala (se existir no Redis)
        if redis_client:
            room_state_json = redis_client.get(f"room:{room_id}:state")
            if room_state_json:
                await websocket.send_text(json.dumps({"type": "initial_state", "state": json.loads(room_state_json)}))

    def disconnect(self, room_id: str, websocket: WebSocket):
        for rid, connections in self.active_connections.items():
            if websocket in connections:
                connections.remove(websocket)
                if not connections:
                    del self.active_connections[rid]

    async def broadcast_to_room(self, room_id: str, payload: dict, sender: WebSocket):
        if room_id not in self.active_connections:
            return

        # Otimização: Movimentos não precisam persistir no Redis (baixa latência)
        if payload.get("type") != "movement" and redis_client:
            redis_client.set(f"room:{room_id}:state", json.dumps(payload))
        
        message_json = json.dumps(payload)
        for connection in self.active_connections[room_id]:
            if connection != sender:
                await connection.send_text(message_json)

manager = ConnectionManager()

@app.websocket("/ws/project/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(room_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            # Retransmite alterações de áudio/cifras/movimento em tempo real para o resto da sala
            await manager.broadcast_to_room(room_id, payload, sender=websocket)
    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "collaboration", "redis": redis_client is not None}
