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

# Add request logging middleware
@app.middleware("http")
async def log_requests(request, call_next):
    print(f"Incoming request: {request.method} {request.url}")
    print(f"Headers: {dict(request.headers)}")
    response = await call_next(request)
    print(f"Response status: {response.status_code}")
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "tube-soundboard-api"}

# Video info endpoint for getting title and duration
@app.post("/video-info")
def get_video_info(request: dict):
    try:
        import yt_dlp
        
        # Debug logging
        print(f"Received request: {request}")
        
        url = request.get('youtube_url')
        if not url:
            print("Missing youtube_url in request")
            raise HTTPException(status_code=400, detail="Missing youtube_url in request")
        
        print(f"Processing URL: {url}")
        
        # Configure yt-dlp to only extract info, not download
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            # Additional options to avoid blocking
            'extractor_retries': 3,
            'fragment_retries': 3,
            'retries': 3,
            'socket_timeout': 30,
            # Add comprehensive headers to avoid 403 errors
            'http_headers': {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-us,en;q=0.5',
                'Accept-Encoding': 'gzip,deflate',
                'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.7',
                'Keep-Alive': '300',
                'Connection': 'keep-alive',
            }
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Get duration in seconds and convert to MM:SS format
            duration_seconds = info.get('duration', 0)
            if duration_seconds:
                minutes = duration_seconds // 60
                seconds = duration_seconds % 60
                duration_formatted = f"{minutes:02d}:{seconds:02d}"
            else:
                duration_formatted = "00:00"
            
            result = {
                "title": info.get('title', 'Unknown Title'),
                "duration": duration_formatted,
                "duration_seconds": duration_seconds,
                "thumbnail": info.get('thumbnail', ''),
                "uploader": info.get('uploader', ''),
                "view_count": info.get('view_count', 0)
            }
            
            print(f"Returning result: {result}")
            return result
            
    except Exception as e:
        print(f"Error in get_video_info: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error fetching video info: {str(e)}")

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
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
