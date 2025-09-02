# YouTube Audio Extraction Agent - Cloud API Example
# FastAPI REST endpoint a core extraction engine köré


# --- REST API PREPARATION ---
from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
import uuid
import threading
from tube_audio_extractor import extract_audio_segment

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- In-memory job and file registry ---
jobs = {}  # job_id: {status, progress, result, error, file_id}
files = {} # file_id: {path, metadata}

class ExtractionRequest(BaseModel):
    youtube_url: str
    start_time: str | int
    end_time: str | int
    output_format: str = "mp3"

class BatchRequest(BaseModel):
    requests: list[ExtractionRequest]

# --- Helper: background extraction ---
def run_extraction(job_id, req: ExtractionRequest):
    try:
        jobs[job_id]["status"] = "running"
        jobs[job_id]["progress"] = 10
        output_path, temp_dir = extract_audio_segment(
            req.youtube_url, req.start_time, req.end_time, req.output_format
        )
        file_id = str(uuid.uuid4())
        files[file_id] = {"path": output_path, "metadata": {
            "youtube_url": req.youtube_url,
            "start_time": req.start_time,
            "end_time": req.end_time,
            "output_format": req.output_format
        }}
        jobs[job_id]["status"] = "done"
        jobs[job_id]["progress"] = 100
        jobs[job_id]["file_id"] = file_id
        jobs[job_id]["result"] = files[file_id]["metadata"]
    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)

@app.post("/extract")
def extract_audio(req: ExtractionRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "queued", "progress": 0, "result": None, "error": None, "file_id": None}
    background_tasks.add_task(run_extraction, job_id, req)
    return {"job_id": job_id, "status": "queued"}

@app.post("/batch")
def batch_extract(req: BatchRequest, background_tasks: BackgroundTasks):
    job_ids = []
    for r in req.requests:
        job_id = str(uuid.uuid4())
        jobs[job_id] = {"status": "queued", "progress": 0, "result": None, "error": None, "file_id": None}
        background_tasks.add_task(run_extraction, job_id, r)
        job_ids.append(job_id)
    return {"job_ids": job_ids}

@app.get("/status/{job_id}")
def get_status(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job_id": job_id, **job}

@app.get("/download/{file_id}")
def download_file(file_id: str):
    file = files.get(file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    path = file["path"]
    fmt = file["metadata"]["output_format"]
    return FileResponse(path, media_type=f"audio/{fmt}", filename=os.path.basename(path))

# --- WebSocket for real-time progress ---
@app.websocket("/ws/progress/{job_id}")
async def websocket_progress(websocket: WebSocket, job_id: str):
    await websocket.accept()
    try:
        while True:
            job = jobs.get(job_id)
            if not job:
                await websocket.send_json({"error": "Job not found"})
                break
            await websocket.send_json({"job_id": job_id, "status": job["status"], "progress": job["progress"]})
            if job["status"] in ("done", "error"):
                break
            import asyncio
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        pass

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
