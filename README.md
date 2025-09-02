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
- Docker (konténerizáció)

## Használat (helyi fejlesztés)

1. Telepítsd a Python 3.12-t és az ffmpeg-et (lásd lejjebb)
2. Telepítsd a Python csomagokat:
   ```
   pip install -r requirements.txt
   ```
3. Indítsd a szervert:
   ```
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```
4. Küldj POST kérést az `/extract` végpontra:
   ```json
   {
     "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
     "start_time": "00:10",
     "end_time": "00:20",
     "output_format": "mp3"
   }
   ```

## Cloud / Docker deploy

1. Építsd meg a konténert:
   ```
   docker build -t tube-soundboard-creator .
   ```
2. Indítsd el:
   ```
   docker run --rm -p 8000:8000 tube-soundboard-creator
   ```
3. Az API elérhető: `http://localhost:8000/extract`

## ffmpeg telepítés (helyi fejlesztéshez)

- Windows: https://www.gyan.dev/ffmpeg/builds/ (lásd részletes útmutató fentebb)
- Linux: `sudo apt install ffmpeg`
- Mac: `brew install ffmpeg`

## Példa API válasz

- Sikeres kérés esetén a válasz egy letölthető audio fájl (Content-Type: audio/mp3 vagy audio/wav)
- Hibás kérés esetén részletes hibaüzenet (JSON)

---

## License

MIT

## Szerző

Szolnoki Zsolt, 2025

> > > > > > > 908b8b3 (Initial commit: YouTube audio extraction agent, API, Docker, docs)
