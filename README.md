# Tube Soundboard Creator

YouTube Audio Extraction Agent & REST API


## Funkcionalitás

- YouTube videókból tetszőleges időintervallum alapján audio szegmensek kinyerése
- Támogatott formátumok: MP3, WAV
- REST API (FastAPI):
   - POST `/extract` – Egy szegmens kinyerése
   - POST `/batch` – Több szegmens egyszerre
   - GET `/status/{job_id}` – Feldolgozás státusz lekérdezése
   - GET `/download/{file_id}` – Kész fájl letöltése
   - WebSocket `/ws/progress/{job_id}` – Valós idejű státusz
- Időbélyeg formátumok: `MM:SS`, `HH:MM:SS`, vagy másodperc (int)
- Minőség-ellenőrzés, hibakezelés, temp file cleanup
- Cloud-ready, platformfüggetlen (Docker, Linux, Windows, Mac, felhő)

## Tech stack

- Python 3.12+
- FastAPI (REST API)
- yt-dlp (YouTube letöltés)
- ffmpeg-python (audio vágás/konvertálás)
- ffmpeg (rendszer bináris)

# Tube Soundboard Creator

YouTube Audio Extraction Agent & REST API


## Features

- Extract audio segments from YouTube videos based on any time interval
- Supported formats: MP3, WAV
- REST API (FastAPI):
   - POST `/extract` – Extract a single segment
   - POST `/batch` – Extract multiple segments in one call
   - GET `/status/{job_id}` – Check progress/status of a job
   - GET `/download/{file_id}` – Download finished audio file
   - WebSocket `/ws/progress/{job_id}` – Real-time progress updates
- Timestamp formats: `MM:SS`, `HH:MM:SS`, or seconds (int)
- Quality check, error handling, temp file cleanup
- Cloud-ready, platform-independent (Docker, Linux, Windows, Mac, cloud)

## Tech Stack

- Python 3.12+
- FastAPI (REST API)
- yt-dlp (YouTube download)
- ffmpeg-python (audio cutting/conversion)
- ffmpeg (system binary)
- Docker (containerization)

## Local Development

1. Install Python 3.12+ and ffmpeg (see below)
2. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Start the server:
   ```
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

4. Example API usage:

### POST /extract
Extract a single segment:
```json
{
   "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
   "start_time": "00:10",
   "end_time": "00:20",
   "output_format": "mp3"
}
```
Response:
```json
{
   "job_id": "...",
   "status": "queued"
}
```

### POST /batch
Extract multiple segments:
```json
{
   "requests": [
      {
         "youtube_url": "https://www.youtube.com/watch?v=coS2CdNd7Io",
         "start_time": "0:38",
         "end_time": "0:39",
         "output_format": "mp3"
      },
      {
         "youtube_url": "https://www.youtube.com/watch?v=mqLMPjeAWGQ",
         "start_time": "1:00",
         "end_time": "1:05",
         "output_format": "mp3"
      },
      {
         "youtube_url": "https://www.youtube.com/watch?v=coS2CdNd7Io",
         "start_time": "2:10",
         "end_time": "2:15",
         "output_format": "wav"
      }
   ]
}
```
Response:
```json
{
   "job_ids": ["...", "...", "..."]
}
```

### GET /status/{job_id}
Check job status/progress:
```json
{
   "job_id": "...",
   "status": "done",
   "progress": 100,
   "file_id": "...",
   ...
}
```

### GET /download/{file_id}
Download the finished audio file (binary response).

### WebSocket /ws/progress/{job_id}
Connect for real-time progress updates (JSON messages).

## Cloud / Docker Deployment

1. Build the container:
   ```
   docker build -t tube-soundboard-creator .
   ```
2. Run it:
   ```
   docker run --rm -p 8000:8000 tube-soundboard-creator
   ```
3. The API is available at: `http://localhost:8000/extract`

## ffmpeg Installation (for local development)

- Windows: https://www.gyan.dev/ffmpeg/builds/ (see detailed guide above)
- Linux: `sudo apt install ffmpeg`
- Mac: `brew install ffmpeg`

## Example API Response

- On success: downloadable audio file (Content-Type: audio/mp3 or audio/wav)
- On error: detailed error message (JSON)

---

## License

MIT

## Author

Szoleczki Zoltán, 2025
