# Changelog

## 2025-09-05 – Modern UI, Mobile & Theme Overhaul

### Frontend (React + Vite PWA)

- Teljesen új, modern UI: horror soundboard stílus, kártya-alapú elrendezés, mobilbarát grid
- Világos/sötét/auto mód váltó, dinamikus színpaletta CSS változókkal, fixen a fejlécben
- Minden komponens, gomb, form, quota, grid automatikusan vált színt a témával
- Mobilnézet: egyenlő margók, reszponzív form és gombok, kártya nem lóg ki, max szélesség javítva
- Fejléc fixen a lap tetején, minden nézetben látható
- Felesleges form háttér eltávolítva, csak a kártya ad hátteret
- UI/UX javítások: középre igazított cím és form, padding és margin optimalizálás
- Hibák javítása: nested <button>, hydration, duplikált palette, nem frissülő színek, border overflow, mobil box-shadow
- Vite dev szerver LAN-ra kiexportálva (`host: true`)
- README frissítve, architektúra és telepítési leírás pontosítva

### Backend (FastAPI, Python)

- Változatlan az előző kiadáshoz képest

---

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
- Hangfájlok Blob-ként tárolva IndexedDB-ben: minden session-ben visszajátszható, nem tűnnek el újratöltés után
- Offline támogatás (service worker, offline.html)
- IndexedDB-alapú helyi tárolás (50MB kvóta)
- PWA install prompt, offline státusz kijelzés
- API proxy a backendhez (`vite.config.js`)
- Letisztult, strukturált komponens- és hook-architektúra

---

For previous changes, see git history.
