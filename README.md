# Tube Soundboard Creator

YouTube Audio Extraction Agent & REST API

## Funkcionalitás

- YouTube videókból tetszőleges időintervallum alapján audio szegmensek kinyerése
- Támogatott formátumok: MP3, WAV
- REST API (FastAPI) POST /extract végponttal
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
- REST API (FastAPI) with POST /extract endpoint
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
4. Send a POST request to the `/extract` endpoint:
   ```json
   {
     "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
     "start_time": "00:10",
     "end_time": "00:20",
     "output_format": "mp3"
   }
   ```

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
