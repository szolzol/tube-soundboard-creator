from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import json

app = FastAPI()

class VideoInfoRequest(BaseModel):
    youtube_url: str

@app.get("/")
def root():
    return {"message": "Tube Soundboard API", "status": "active"}

@app.get("/health")  
def health():
    return {"status": "healthy"}

@app.post("/video-info")
def get_video_info(req: VideoInfoRequest):
    """Get video info using yt-dlp"""
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
            }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Vercel serverless function handler
def handler(request):
    from mangum import Mangum
    asgi_handler = Mangum(app)
    return asgi_handler(request)
