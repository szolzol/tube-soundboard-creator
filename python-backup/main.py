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

# Debug endpoint to check deployment version
@app.get("/debug/version")
def debug_version():
    import os
    import inspect
    from tube_audio_extractor import extract_audio_segment
    
    # Get the source file of the extract_audio_segment function
    source_file = inspect.getfile(extract_audio_segment)
    
    # Get git commit hash if available
    git_hash = "unknown"
    try:
        import subprocess
        result = subprocess.run(['git', 'rev-parse', 'HEAD'], capture_output=True, text=True, cwd='.')
        if result.returncode == 0:
            git_hash = result.stdout.strip()[:8]
    except:
        pass
    
    return {
        "git_commit": git_hash,
        "extract_function_file": source_file,
        "python_version": os.sys.version,
        "working_directory": os.getcwd(),
        "deployment_timestamp": "2025-09-08-latest"
    }

# Debug endpoint to test extract_audio_segment return values
@app.get("/debug/test-extract")
def debug_test_extract():
    """Test what extract_audio_segment actually returns"""
    try:
        from tube_audio_extractor import extract_audio_segment
        import inspect
        
        # Get function signature
        sig = inspect.signature(extract_audio_segment)
        
        # Try to call with a very short clip to see return format
        # Using a public domain video that should always work
        result = extract_audio_segment(
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "1", "3", "mp3"
        )
        
        return {
            "function_signature": str(sig),
            "result_type": str(type(result)),
            "result_length": len(result) if isinstance(result, (tuple, list)) else "not iterable",
            "result_values": [str(type(item)) for item in result] if isinstance(result, (tuple, list)) else "not iterable",
            "test_successful": True
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "error_type": str(type(e)),
            "test_successful": False
        }

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
        
        # Extract video info for metadata
        print(f"🚀 Starting extraction for job {job_id}")
        print(f"📺 URL: {req.youtube_url}")
        print(f"⏰ Start: {req.start_time}, End: {req.end_time}")
        print(f"🎵 Format: {req.output_format}")
        
        # Import and version info
        import yt_dlp
        import ffmpeg
        print(f"📦 yt-dlp version: {yt_dlp.version.__version__}")
        print(f"📦 Python version: {__import__('sys').version}")
        
        result = extract_audio_segment(
            req.youtube_url, req.start_time, req.end_time, req.output_format
        )
        
        print(f"🔍 Result type: {type(result)}")
        print(f"🔍 Result length: {len(result) if isinstance(result, tuple) else 'not tuple'}")
        print(f"🔍 Result preview: {str(result)[:200]}...")
        
        # Handle different return formats with detailed logging
        if isinstance(result, tuple):
            print(f"✅ Got tuple with {len(result)} values")
            if len(result) == 2:
                output_path, temp_dir = result
                video_metadata = {}
                print("📁 Using 2-value unpacking (legacy mode)")
            elif len(result) == 3:
                output_path, temp_dir, video_metadata = result
                print("📁 Using 3-value unpacking (new mode)")
            elif len(result) == 5:
                output_path, screenshot_path, thumbnail_path, video_metadata, temp_dir = result
                print("📁 Using 5-value unpacking (full mode)")
            else:
                error_msg = f"Unexpected return format: {len(result)} values returned: {result}"
                print(f"❌ {error_msg}")
                raise ValueError(error_msg)
        else:
            error_msg = f"Expected tuple, got {type(result)}: {result}"
            print(f"❌ {error_msg}")
            raise ValueError(error_msg)
        
        print(f"📁 Output path: {output_path}")
        print(f"📁 Temp dir: {temp_dir}")
        print(f"📊 Metadata: {video_metadata}")
        
        file_id = str(uuid.uuid4())
        files[file_id] = {"path": output_path, "metadata": {
            "youtube_url": req.youtube_url,
            "start_time": req.start_time,
            "end_time": req.end_time,
            "output_format": req.output_format,
            "video_title": video_metadata.get("title", "Unknown") if video_metadata else "Unknown"
        }}
        jobs[job_id]["status"] = "done"
        jobs[job_id]["progress"] = 100
        jobs[job_id]["file_id"] = file_id
        jobs[job_id]["result"] = files[file_id]["metadata"]
        
        print(f"🎉 Job {job_id} completed successfully")
        
    except Exception as e:
        error_msg = f"Job {job_id} failed: {str(e)}"
        print(f"❌ {error_msg}")
        import traceback
        print("📋 Full traceback:")
        traceback.print_exc()
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

@app.get("/thumbnail/{file_id}")
def get_thumbnail(file_id: str):
    from fastapi.responses import RedirectResponse
    import requests
    
    file = files.get(file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # For now, return the YouTube thumbnail URL from metadata
    metadata = file.get("metadata", {})
    youtube_url = metadata.get("youtube_url", "")
    
    if youtube_url:
        # Extract video ID from YouTube URL (supports both regular and Shorts URLs)
        import re
        # Try standard YouTube URL format first (v=VIDEO_ID)
        match = re.search(r"v=([\w-]+)", youtube_url)
        if not match:
            # Try YouTube Shorts format (/shorts/VIDEO_ID)
            match = re.search(r"/shorts/([\w-]+)", youtube_url)
        if match:
            video_id = match.group(1)
            
            # Try multiple thumbnail qualities in order of preference
            thumbnail_options = [
                f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg",  # 1280x720
                f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",     # 480x360
                f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg",     # 320x180
                f"https://img.youtube.com/vi/{video_id}/sddefault.jpg",     # 640x480
                f"https://img.youtube.com/vi/{video_id}/default.jpg"        # 120x90
            ]
            
            # Test each thumbnail URL and return the first working one
            for thumbnail_url in thumbnail_options:
                try:
                    # Quick HEAD request to check if thumbnail exists
                    response = requests.head(thumbnail_url, timeout=5)
                    if response.status_code == 200:
                        return RedirectResponse(url=thumbnail_url)
                except:
                    continue
    
    raise HTTPException(status_code=404, detail="Thumbnail not available")

@app.get("/screenshot/{file_id}")
def get_screenshot(file_id: str):
    from fastapi.responses import RedirectResponse
    import requests
    
    file = files.get(file_id)
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Return a different YouTube thumbnail (medium quality) for screenshots
    metadata = file.get("metadata", {})
    youtube_url = metadata.get("youtube_url", "")
    
    if youtube_url:
        # Extract video ID from YouTube URL (supports both regular and Shorts URLs)
        import re
        # Try standard YouTube URL format first (v=VIDEO_ID)
        match = re.search(r"v=([\w-]+)", youtube_url)
        if not match:
            # Try YouTube Shorts format (/shorts/VIDEO_ID)
            match = re.search(r"/shorts/([\w-]+)", youtube_url)
        if match:
            video_id = match.group(1)
            
            # Try multiple screenshot/thumbnail qualities in different order for variety
            screenshot_options = [
                f"https://img.youtube.com/vi/{video_id}/mqdefault.jpg",     # 320x180 - good for screenshots
                f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",     # 480x360
                f"https://img.youtube.com/vi/{video_id}/sddefault.jpg",     # 640x480
                f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg", # 1280x720
                f"https://img.youtube.com/vi/{video_id}/default.jpg"        # 120x90
            ]
            
            # Test each screenshot URL and return the first working one
            for screenshot_url in screenshot_options:
                try:
                    # Quick HEAD request to check if thumbnail exists
                    response = requests.head(screenshot_url, timeout=5)
                    if response.status_code == 200:
                        return RedirectResponse(url=screenshot_url)
                except:
                    continue
    
    raise HTTPException(status_code=404, detail="Screenshot not available")

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
