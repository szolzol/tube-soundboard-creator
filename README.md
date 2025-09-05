# Tube Soundboard

**Cross-platform YouTube soundboard app with audio extraction, offline support, and installable PWA frontend.**

---

## Elkészült funkciók (Current Version Features)

### Backend (FastAPI, Python)

- YouTube audio szegmensek kinyerése tetszőleges időintervallum alapján (yt-dlp, ffmpeg)
- REST API végpontok:
  - `POST /extract` – Egy szegmens kinyerése
  - `POST /batch` – Több szegmens egyszerre
  - `GET /status/{job_id}` – Feldolgozás státusz lekérdezése
  - `GET /download/{file_id}` – Kész fájl letöltése
  - `GET /session` – Szekciókezelés
  - `WebSocket /ws/progress/{job_id}` – Valós idejű státusz
- Időbélyeg formátumok támogatása: `MM:SS`, `HH:MM:SS`, másodperc (int)
- Hibakezelés, minőség-ellenőrzés, temp file cleanup
- Docker támogatás, platformfüggetlen futtatás

### Frontend (React + Vite PWA)

- Modern, installálható webapp (PWA) React alapon
- YouTube hangklip hozzáadása URL és időintervallum alapján
- Hangklip lejátszás, törlés, helyi kezelés
- Hangfájlok Blob-ként tárolva IndexedDB-ben: minden session-ben visszajátszható, nem tűnnek el újratöltés után
- Offline támogatás (service worker, offline.html)
- IndexedDB-alapú helyi tárolás (50MB kvóta)
- PWA install prompt, offline státusz kijelzés
- API proxy a backendhez (`vite.config.js`)
- Letisztult, strukturált komponens- és hook-architektúra
- **2025-09-05:**
  - Teljesen új, modern UI: horror soundboard stílus, kártya-alapú elrendezés, mobilbarát grid
  - Világos/sötét mód váltó, dinamikus színpaletta CSS változókkal
  - Minden komponens, gomb, form, quota, grid automatikusan vált színt a témával
  - Mobilnézet: egyenlő margók, reszponzív form és gombok
  - Hibák javítása: nested <button>, hydration, duplikált palette, nem frissülő színek

---

## Project Structure

```
├── main.py                  # FastAPI backend entrypoint
├── tube_audio_extractor.py  # Core audio extraction logic
├── requirements.txt         # Python dependencies
├── Dockerfile               # Docker support for backend
├── tube-react-frontend/     # React PWA frontend (Vite)
│   ├── src/                 # React source code
│   ├── public/              # PWA assets (manifest, sw.js, offline.html, icons)
│   ├── package.json         # Frontend dependencies/scripts
│   └── vite.config.js       # Vite config (API proxy)
└── ...
```

---

## Architecture

### Backend (FastAPI, Python)

- Extracts audio segments from YouTube videos via REST API
- Technologies: FastAPI, yt-dlp, ffmpeg-python, ffmpeg, Docker-ready
- Endpoints:
  - `POST /extract` – Extract a single audio segment
  - `POST /batch` – Extract multiple segments
  - `GET /status/{job_id}` – Check extraction job status
  - `GET /download/{file_id}` – Download finished audio file
  - `GET /session` – Session management
  - `WebSocket /ws/progress/{job_id}` – Real-time progress updates

### Frontend (`tube-react-frontend/`, React + Vite PWA)

- Modern, installable web app for managing, extracting, and playing YouTube audio clips
- Technologies: React, Vite, PWA (manifest, service worker), IndexedDB, offline-first
- Features:
  - Add new audio clips from YouTube by URL and time range
  - Play, delete, and manage local audio clips
  - Offline support (service worker, offline.html)
  - Installable as a PWA (Add to Home Screen)
  - Storage quota monitoring (50MB limit)
  - All audio stored in browser (IndexedDB)

---

## Installation & Usage

### Backend (FastAPI)

**Requirements:** Python 3.12+, ffmpeg (system), yt-dlp

```sh
pip install -r requirements.txt
uvicorn main:app --reload
# (Optional) Docker:
docker build -t tube-soundboard .
docker run -p 8000:8000 tube-soundboard
```

### Frontend (React PWA)

**Requirements:** Node.js 18+, npm

```sh
cd tube-react-frontend
npm install
npm run dev
# Open http://localhost:5173
```

**Build for production:**

```sh
npm run build
npm run preview
```

---

## Main Components & Files

### Backend

- `main.py`: FastAPI app, REST endpoints, job/session management
- `tube_audio_extractor.py`: Core extraction logic (yt-dlp, ffmpeg)
- `requirements.txt`: Python dependencies
- `Dockerfile`: Containerized backend

### Frontend (`tube-react-frontend/`)

- `src/App.jsx`: Main app, integrates all UI components
- `src/components/AudioManager.jsx`: Add, play, and delete audio clips; interacts with backend and IndexedDB
- `src/components/InstallPrompt.jsx`: Shows PWA install prompt
- `src/components/OfflineIndicator.jsx`: Shows offline status
- `src/hooks/useAudioStorage.js`: Audio file CRUD in IndexedDB
- `src/hooks/useIndexedDB.js`: Generic IndexedDB wrapper
- `src/hooks/useStorageQuota.js`: Monitors storage usage/quota
- `src/hooks/usePWA.js`: Handles PWA install and offline state
- `public/manifest.json`: PWA manifest (icons, name, theme)
- `public/sw.js`: Service worker for offline support
- `public/offline.html`: Offline fallback page
- `vite.config.js`: Vite config, API proxy to backend

---

## Usage Notes

- All audio clips are stored in your browser (IndexedDB). The app works offline, but extraction requires backend access.
- You can install the app on desktop/mobile for a native-like experience (PWA).
- Audio storage is limited to 50MB per browser.
- The frontend proxies API calls to the backend (see `vite.config.js`).

---

## License

MIT License

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
