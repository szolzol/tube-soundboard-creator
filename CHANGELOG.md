# Changelog

## 2025-09-04 – First Public Release Baseline

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
- [2025-09-05] Hangfájlok Blob-ként tárolva IndexedDB-ben: minden session-ben visszajátszható, nem tűnnek el újratöltés után
- Offline támogatás (service worker, offline.html)
- IndexedDB-alapú helyi tárolás (50MB kvóta)
- PWA install prompt, offline státusz kijelzés
- API proxy a backendhez (`vite.config.js`)
- Letisztult, strukturált komponens- és hook-architektúra

---

For previous changes, see git history.
