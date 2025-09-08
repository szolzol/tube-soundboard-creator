# Firebase Cloud Functions - YouTube Audio Extraction API
# Optimized for Firebase Cloud Functions with Cloud Storage integration

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request, Response
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import uuid
import json
import tempfile
import shutil
from datetime import datetime, timedelta
from typing import Optional

# Firebase imports
try:
    from firebase_admin import storage, firestore, initialize_app
    import firebase_admin
    
    # Initialize Firebase if not already done
    if not firebase_admin._apps:
        initialize_app()
    
    # Get Firestore client
    db = firestore.client()
    # Get Storage bucket
    bucket = storage.bucket()
    
    FIREBASE_AVAILABLE = True
except ImportError:
    print("Firebase modules not available - running in local mode")
    FIREBASE_AVAILABLE = False
    db = None
    bucket = None

# Import your extraction engine
try:
    from tube_audio_extractor import extract_audio_segment
except ImportError:
    # Create a mock for development
    def extract_audio_segment(url, start, end, format):
        raise HTTPException(status_code=500, detail="Audio extraction not available")

app = FastAPI(title="Tube Soundboard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Request Models ---
class ExtractionRequest(BaseModel):
    youtube_url: str
    start_time: str | int
    end_time: str | int
    output_format: str = "mp3"

class VideoInfoRequest(BaseModel):
    youtube_url: str

# --- In-memory job tracking (for Cloud Functions) ---
jobs = {}

# --- Firebase Storage Helpers ---
def upload_to_firebase_storage(file_path: str, destination_path: str) -> str:
    """Upload file to Firebase Storage and return public URL"""
    if not FIREBASE_AVAILABLE:
        return f"local://{file_path}"
    
    try:
        blob = bucket.blob(destination_path)
        blob.upload_from_filename(file_path)
        
        # Make the blob publicly accessible
        blob.make_public()
        
        return blob.public_url
    except Exception as e:
        print(f"Failed to upload to Firebase Storage: {e}")
        return None

def save_metadata_to_firestore(file_id: str, metadata: dict):
    """Save file metadata to Firestore"""
    if not FIREBASE_AVAILABLE:
        print(f"Local mode: Would save metadata for {file_id}")
        return
    
    try:
        doc_ref = db.collection('audio_files').document(file_id)
        doc_ref.set({
            **metadata,
            'created_at': firestore.SERVER_TIMESTAMP,
            'file_id': file_id
        })
        print(f"Metadata saved to Firestore for {file_id}")
    except Exception as e:
        print(f"Failed to save metadata to Firestore: {e}")

def get_metadata_from_firestore(file_id: str) -> Optional[dict]:
    """Get file metadata from Firestore"""
    if not FIREBASE_AVAILABLE:
        return None
    
    try:
        doc_ref = db.collection('audio_files').document(file_id)
        doc = doc_ref.get()
        if doc.exists:
            return doc.to_dict()
        return None
    except Exception as e:
        print(f"Failed to get metadata from Firestore: {e}")
        return None

# --- Background Extraction ---
def run_extraction(job_id: str, req: ExtractionRequest):
    try:
        jobs[job_id]["status"] = "running"
        jobs[job_id]["progress"] = 10
        
        # Extract audio segment
        output_path, screenshot_path, thumbnail_path, video_metadata, temp_dir = extract_audio_segment(
            req.youtube_url, req.start_time, req.end_time, req.output_format
        )
        
        file_id = str(uuid.uuid4())
        
        # Upload files to Firebase Storage
        audio_url = None
        thumbnail_url = None
        screenshot_url = None
        
        if output_path and os.path.exists(output_path):
            audio_url = upload_to_firebase_storage(
                output_path, 
                f"audio/{file_id}.{req.output_format}"
            )
        
        if thumbnail_path and os.path.exists(thumbnail_path):
            thumbnail_url = upload_to_firebase_storage(
                thumbnail_path, 
                f"thumbnails/{file_id}.jpg"
            )
        
        if screenshot_path and os.path.exists(screenshot_path):
            screenshot_url = upload_to_firebase_storage(
                screenshot_path, 
                f"screenshots/{file_id}.jpg"
            )
        
        # Prepare metadata
        metadata = {
            "youtube_url": req.youtube_url,
            "start_time": req.start_time,
            "end_time": req.end_time,
            "output_format": req.output_format,
            "audio_url": audio_url,
            "thumbnail_url": thumbnail_url,
            "screenshot_url": screenshot_url,
            "video_title": video_metadata.get('title', 'Untitled'),
            "video_uploader": video_metadata.get('uploader', 'Unknown'),
            "video_duration": video_metadata.get('duration', 0),
            "video_view_count": video_metadata.get('view_count', 0)
        }
        
        # Save metadata to Firestore
        save_metadata_to_firestore(file_id, metadata)
        
        # Clean up temporary files
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
        
        # Update job status
        jobs[job_id]["status"] = "done"
        jobs[job_id]["progress"] = 100
        jobs[job_id]["file_id"] = file_id
        jobs[job_id]["result"] = metadata
        
    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["error"] = str(e)

# --- API Endpoints ---

@app.get("/")
def root():
    return {
        "message": "Tube Soundboard API",
        "version": "1.0.0",
        "firebase_available": FIREBASE_AVAILABLE
    }

@app.post("/extract")
def extract_audio(req: ExtractionRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status": "queued", 
        "progress": 0, 
        "result": None, 
        "error": None, 
        "file_id": None
    }
    
    background_tasks.add_task(run_extraction, job_id, req)
    
    return {"job_id": job_id, "status": "queued"}

@app.get("/status/{job_id}")
def get_status(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job_id": job_id, **job}

@app.post("/video-info")
def get_video_info(req: VideoInfoRequest):
    """Get video info (duration, title, etc.) without downloading the video"""
    try:
        import yt_dlp
        
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(req.youtube_url, download=False)
            
            return {
                "title": info.get('title', 'Unknown'),
                "duration": info.get('duration', 0),
                "uploader": info.get('uploader', 'Unknown'),
                "view_count": info.get('view_count', 0),
                "description": info.get('description', '')[:500] + '...' if info.get('description', '') else '',
            }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get video info: {str(e)}")

@app.get("/file/{file_id}")
def get_file_info(file_id: str):
    """Get file information from Firestore"""
    metadata = get_metadata_from_firestore(file_id)
    if not metadata:
        raise HTTPException(status_code=404, detail="File not found")
    return metadata

@app.get("/download/{file_id}")
def download_file(file_id: str):
    """Redirect to Firebase Storage URL for file download"""
    metadata = get_metadata_from_firestore(file_id)
    if not metadata or not metadata.get('audio_url'):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Return redirect to the Firebase Storage URL
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=metadata['audio_url'])

@app.get("/thumbnail/{file_id}")
def get_thumbnail(file_id: str):
    """Redirect to Firebase Storage URL for thumbnail"""
    metadata = get_metadata_from_firestore(file_id)
    if not metadata or not metadata.get('thumbnail_url'):
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=metadata['thumbnail_url'])

@app.get("/screenshot/{file_id}")
def get_screenshot(file_id: str):
    """Redirect to Firebase Storage URL for screenshot"""
    metadata = get_metadata_from_firestore(file_id)
    if not metadata or not metadata.get('screenshot_url'):
        raise HTTPException(status_code=404, detail="Screenshot not found")
    
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=metadata['screenshot_url'])

# Health check endpoint
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "firebase_available": FIREBASE_AVAILABLE
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
