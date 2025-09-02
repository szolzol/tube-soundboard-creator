# --- CORE EXTRACTION ENGINE ---

import os
import tempfile
import ffmpeg

def parse_timestamp(ts):
    """Bármilyen timestamp string/int -> másodperc (int)"""
    if isinstance(ts, int):
        return ts
    if isinstance(ts, float):
        return int(ts)
    if isinstance(ts, str):
        parts = ts.strip().split(":")
        try:
            if len(parts) == 1:
                return int(parts[0])
            elif len(parts) == 2:
                return int(parts[0])*60 + int(parts[1])
            elif len(parts) == 3:
                return int(parts[0])*3600 + int(parts[1])*60 + int(parts[2])
        except Exception:
            pass
    raise ValueError(f"Érvénytelen timestamp: {ts}")

def extract_audio_segment(youtube_url, start_time, end_time, output_format):
    """
    Core extraction engine (ffmpeg-only):
    - youtube_url: YouTube videó URL
    - start_time, end_time: timestamp (str/int)
    - output_format: 'mp3' vagy 'wav'
    """
    import yt_dlp
    import validators
    import shutil

    # 1. URL validation
    if not validators.url(youtube_url):
        raise ValueError("Érvénytelen YouTube URL!")

    # 2. Video download (audio only, temp file)
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'outtmpl': None,  # temp fájl
        'noplaylist': True,
        'no_warnings': True,
        'prefer_ffmpeg': True,
        'extractaudio': True,
        'cachedir': False
    }
    temp_dir = tempfile.mkdtemp(prefix="yt-audio-")
    temp_audio_path = os.path.join(temp_dir, "audio.%(ext)s")
    ydl_opts['outtmpl'] = temp_audio_path

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=True)
            downloaded_path = ydl.prepare_filename(info)
    except Exception as e:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise RuntimeError(f"YouTube letöltési hiba: {e}")

    # 3. Timestamp conversion
    try:
        start_sec = parse_timestamp(start_time)
        end_sec = parse_timestamp(end_time)
        if start_sec < 0 or end_sec <= start_sec:
            raise ValueError("Érvénytelen időintervallum!")
    except Exception as e:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise ValueError(f"Időbélyeg hiba: {e}")

    # 4. Audio segment cutting & format conversion (ffmpeg streaming)
    output_ext = output_format.lower()
    if output_ext not in ("mp3", "wav"):
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise ValueError("Csak mp3 vagy wav támogatott!")
    output_path = os.path.join(temp_dir, f"output.{output_ext}")
    try:
        # Mindig transzkódolunk mp3/wav esetén, nem használunk 'copy'-t
        process = (
            ffmpeg
            .input(downloaded_path, ss=start_sec, to=end_sec)
            .output(output_path, format=output_ext)
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
    except ffmpeg.Error as e:
        shutil.rmtree(temp_dir, ignore_errors=True)
        err_msg = e.stderr.decode(errors='ignore') if hasattr(e, 'stderr') else str(e)
        raise RuntimeError(f"FFmpeg szegmentálási/konvertálási hiba: {err_msg}")
    except Exception as e:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise RuntimeError(f"FFmpeg szegmentálási/konvertálási hiba: {e}")

    # 5. File output (return path)
    return output_path, temp_dir

# --- Példa hívás ---
if __name__ == "__main__":
    url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    start = "00:10"
    end = "00:20"
    fmt = "mp3"
    try:
        out_path, tmp_dir = extract_audio_segment(url, start, end, fmt)
        print(f"✅ Sikeres kivágás: {out_path}")
        # (Itt lehetne a fájlt áthelyezni, feldolgozni, stb.)
        # Takarítás
        import shutil
        shutil.rmtree(tmp_dir, ignore_errors=True)
    except Exception as e:
        print(f"❌ Hiba: {e}")

# yt-dlp alapú metadata és audio stream lekérdezés
import yt_dlp
import validators

def extract_with_ytdlp(url):
    if not validators.url(url):
        raise ValueError("Érvénytelen YouTube URL!")

    ydl_opts = {
        'quiet': True,
        'skip_download': True,
        'forcejson': True,
        'extract_flat': False,
        'format': 'bestaudio/best'
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    print(f"Cím: {info.get('title')}")
    print(f"Hossz: {info.get('duration')} másodperc ({info.get('duration')//60}:{info.get('duration')%60:02d})")
    print(f"Csatorna: {info.get('uploader')}")
    print(f"Nézettség: {info.get('view_count'):,}")

    # Audio streamek listázása
    formats = [f for f in info['formats'] if f.get('acodec') != 'none']
    if not formats:
        print("❌ Nincs elérhető audio stream!")
        return None

    print(f"\nElérhető audio streamek: {len(formats)}")
    # Csak azok, ahol abr nem None
    formats_with_abr = [f for f in formats if f.get('abr') is not None]
    if not formats_with_abr:
        print("❌ Nincs elérhető audio stream bitrate információval!")
        return None
    formats_sorted = sorted(formats_with_abr, key=lambda x: x['abr'], reverse=True)
    for i, f in enumerate(formats_sorted):
        print(f" {i+1}. ext: {f.get('ext')}, acodec: {f.get('acodec')}, abr: {f.get('abr', 'N/A')} kbps, filesize: ~{(f.get('filesize',0) or 0)/1024/1024:.1f}MB")

    best = formats_sorted[0]
    print(f"\n🎵 Maximális minőség:")
    print(f"   Bitrate: {best.get('abr', 'N/A')} kbps")
    print(f"   Formátum: {best.get('ext')}")
    print(f"   Fájlméret: ~{(best.get('filesize',0) or 0)/1024/1024:.1f}MB")
    return info

# Teszt futtatása yt-dlp-vel
url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
extract_with_ytdlp(url)
