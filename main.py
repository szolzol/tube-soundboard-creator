# YouTube Audio Extraction Agent - Cloud API Example
# FastAPI REST endpoint a core extraction engine köré

from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import uvicorn
import os
from tube_audio_extractor import extract_audio_segment

app = FastAPI()

class ExtractionRequest(BaseModel):
    youtube_url: str
    start_time: str | int
    end_time: str | int
    output_format: str = "mp3"

@app.post("/extract")
def extract_audio(req: ExtractionRequest):
    try:
        output_path, temp_dir = extract_audio_segment(
            req.youtube_url, req.start_time, req.end_time, req.output_format
        )
        filename = os.path.basename(output_path)
        return FileResponse(
            output_path,
            media_type=f"audio/{req.output_format}",
            filename=filename,
            background=None  # temp cleanup handled by client or custom logic
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
