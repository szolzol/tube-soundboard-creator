
<p align="center">
  <img src="tubesoundboard_logo.png" alt="Tube Soundboard Creator Logo" style="height:64px; background:transparent;" />
</p>

# Tube Soundboard Creator

YouTube Audio Extraction Agent & Soundboard Web App

## Features

- Extract audio segments from YouTube videos based on any time interval
- Supported formats: MP3, WAV
- Thumbnail and screenshot extraction (YouTube video thumbnails)
- Persistent sound metadata (coming soon: SQLite or cloud DB)
- REST API (FastAPI, hosted on Railway):
  - POST `/extract` – Extract a single segment
  - POST `/batch` – Extract multiple segments in one call
  - GET `/status/{job_id}` – Check progress/status of a job
  - GET `/download/{file_id}` – Download finished audio file
  - GET `/thumbnail/{file_id}` – Get YouTube thumbnail for a sound (redirects to image)
  - WebSocket `/ws/progress/{job_id}` – Real-time progress updates
  - POST `/video-info` – Get YouTube video title/duration/thumbnail
- Timestamp formats: `MM:SS`, `HH:MM:SS`, or seconds (int)
- Quality check, error handling, temp file cleanup
- Cloud-ready, platform-independent (Docker, Linux, Windows, Mac, Railway, Firebase)

## Hosting Structure

- **Frontend:** React app hosted on Firebase Hosting ([https://tubesoundboard.web.app](https://tubesoundboard.web.app))
- **Backend:** FastAPI app hosted on Railway ([https://tubesoundboard-production.up.railway.app](https://tubesoundboard-production.up.railway.app))

## Project Structure

```
tube-soundboard/
├── tube-react-frontend/          # React frontend (Firebase Hosting)
│   ├── dist/                     # Built files
│   ├── src/
│   │   ├── components/           # UI components (AddSoundForm, SoundboardGrid, etc.)
│   │   ├── services/apiService.js # API service layer
│   │   └── config/firebase.js    # Firebase config
│   ├── .env.production          # Production env vars
│   └── .env.local               # Local env vars
├── main.py                      # FastAPI backend (Railway)
├── tube_audio_extractor.py      # Audio extraction logic
├── requirements.txt             # Python dependencies
├── firebase.json                # Firebase config
├── railway.json                 # Railway config
├── vercel.json                  # Vercel config (optional)
├── DEPLOYMENT.md                # Deployment guide
├── QUICK_DEPLOY.md              # Quick deploy guide
├── FREE_HOSTING_OPTIONS.md      # Free hosting comparison
└── README.md
```

## Tech Stack

- Python 3.12+
- FastAPI (REST API)
- yt-dlp (YouTube download)
- ffmpeg-python (audio cutting/conversion)
- ffmpeg (system binary)
- Docker (containerization)
- React (frontend)
- Firebase Hosting (frontend)
- Railway (backend)

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
4. Start the frontend:
   ```
   cd tube-react-frontend
   npm install
   npm run dev
   ```

## Example API Usage

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

### GET /thumbnail/{file_id}

Redirects to the YouTube thumbnail image for the extracted sound.

### WebSocket /ws/progress/{job_id}

Connect for real-time progress updates (JSON messages).

### POST /video-info

Get YouTube video title, duration, and thumbnail (used by frontend for form auto-fill).

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

- Windows: https://www.gyan.dev/ffmpeg/builds/
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
