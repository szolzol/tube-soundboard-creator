# YouTube Audio Extraction Agent - Cloud API Example
# FastAPI REST endpoint a core extraction engine köré


# --- REST API PREPARATION ---

from fastapi import FastAPI, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect, Request, Response, Depends
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
import uuid
import threading
from tube_audio_extractor import extract_audio_segment
# Session management import
from auth.session_manager import (
    SessionMiddleware, get_session_from_cookie, update_session_data, create_anonymous_session, SESSION_COOKIE, RATE_LIMIT, get_db
)
import json
from datetime import datetime, timedelta


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Add session middleware
app.add_middleware(SessionMiddleware)

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

def run_extraction(job_id, req: ExtractionRequest, session_id=None):
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
        # Update extraction count for session
        if session_id:
            # Increment extraction_count and update quota_reset_time if needed
            with get_db() as db:
                row = db.execute("SELECT extraction_count, quota_reset_time FROM sessions WHERE session_id = ?", (session_id,)).fetchone()
                now = datetime.utcnow()
                if row:
                    extraction_count = row["extraction_count"] if "extraction_count" in row.keys() else 0
                    quota_reset_time = row["quota_reset_time"] if "quota_reset_time" in row.keys() else None
                    if quota_reset_time:
                        quota_reset_time = datetime.fromisoformat(quota_reset_time)
                    else:
                        quota_reset_time = now
                    # Reset quota if needed
                    if now > quota_reset_time:
                        extraction_count = 0
                        quota_reset_time = now + timedelta(hours=1)
                    extraction_count += 1
                    db.execute("UPDATE sessions SET extraction_count = ?, quota_reset_time = ? WHERE session_id = ?", (extraction_count, quota_reset_time.isoformat(), session_id))
    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)


# Helper to get session from request
def get_session(request: Request):
    session_id = request.cookies.get(SESSION_COOKIE)
    session = get_session_from_cookie(session_id)
    return session

def check_and_update_rate_limit(session):
    # Rate limit logika ideiglenesen kikapcsolva
    return

@app.post("/extract")
def extract_audio(req: ExtractionRequest, background_tasks: BackgroundTasks, request: Request = None):
    session = get_session(request)
    if session:
        check_and_update_rate_limit(session)
        session_id = session["session_id"]
    else:
        session_id = None
    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "queued", "progress": 0, "result": None, "error": None, "file_id": None}
    background_tasks.add_task(run_extraction, job_id, req, session_id)
    return {"job_id": job_id, "status": "queued"}


@app.post("/batch")
def batch_extract(req: BatchRequest, background_tasks: BackgroundTasks, request: Request = None):
    session = get_session(request)
    if session:
        # Only allow up to 10 extractions per hour in total
        now = datetime.utcnow()
        extraction_count = session.get("extraction_count", 0)
        quota_reset_time = session.get("quota_reset_time")
        if quota_reset_time:
            quota_reset_time = datetime.fromisoformat(quota_reset_time)
        else:
            quota_reset_time = now + timedelta(hours=1)
        if now > quota_reset_time:
            extraction_count = 0
            quota_reset_time = now + timedelta(hours=1)
        if extraction_count + len(req.requests) > 10:
            raise HTTPException(status_code=429, detail="Extraction rate limit exceeded (10/hour)")
        extraction_count += len(req.requests)
        update_session_data(session["session_id"], extraction_count=extraction_count, quota_reset_time=quota_reset_time.isoformat())
        session_id = session["session_id"]
    else:
        session_id = None
    job_ids = []
    for r in req.requests:
        job_id = str(uuid.uuid4())
        jobs[job_id] = {"status": "queued", "progress": 0, "result": None, "error": None, "file_id": None}
        background_tasks.add_task(run_extraction, job_id, r, session_id)
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

# --- Session Management Endpoints ---
from fastapi import status

@app.get("/session", response_class=JSONResponse)
def get_or_create_session(request: Request, response: Response):
    session_id = request.cookies.get(SESSION_COOKIE)
    session = get_session_from_cookie(session_id)
    if not session:
        session = create_anonymous_session()
        response.set_cookie(
            SESSION_COOKIE,
            session["session_id"],
            max_age=60*60*24*30,
            httponly=True,
            samesite="lax"
        )
    return {
        "session_id": session["session_id"],
        "created_at": session["created_at"],
        "last_active": session["last_active"],
        "preferences": session.get("preferences", {}),
        "extraction_count": session.get("extraction_count", 0),
        "quota_reset_time": session.get("quota_reset_time")
    }

@app.put("/session/config", status_code=status.HTTP_204_NO_CONTENT)
def save_soundboard_layout(request: Request, config: dict):
    session = get_session(request)
    if not session:
        raise HTTPException(status_code=401, detail="No session")
    update_session_data(session["session_id"], soundboard_config=config)
    return Response(status_code=204)

@app.get("/session/config")
def load_soundboard_layout(request: Request):
    session = get_session(request)
    if not session:
        raise HTTPException(status_code=401, detail="No session")
    return session.get("soundboard_config", {})

@app.get("/session/sounds")
def list_user_sounds(request: Request):
    session = get_session(request)
    if not session:
        raise HTTPException(status_code=401, detail="No session")
    # Example: list all files for this session (if you store per-session)
    # Here, just return all files for demo
    return [
        {"file_id": fid, **f["metadata"]}
        for fid, f in files.items()
    ]

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
