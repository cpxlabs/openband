from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from worker import celery_app

app = FastAPI(title="Openband AI Stem Separation API")

class StemRequest(BaseModel):
    project_id: str
    audio_file_url: str

@app.post("/separate")
async def request_stem_separation(payload: StemRequest):
    # Envia a tarefa para o Celery (não bloqueia a API)
    task = celery_app.send_task(
        "process_stem_separation",
        args=[payload.audio_file_url, payload.project_id]
    )
    return {
        "message": "Separation process started",
        "task_id": task.id,
        "status_url": f"/status/{task.id}"
    }

@app.get("/status/{task_id}")
async def get_task_status(task_id: str):
    task_result = celery_app.AsyncResult(task_id)
    return {
        "task_id": task_id,
        "status": task_result.status,
        "result": task_result.result if task_result.ready() else None
    }
