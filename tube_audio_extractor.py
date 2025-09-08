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

    import time
    def progress(msg):
        print(msg, flush=True)

    step = "VALIDATE"
    t0 = time.time()
    progress(f"🔄 [STEP] {step}: URL validation (0%)")
    if not validators.url(youtube_url):
        progress(f"❌ [ERROR] {step}: Invalid YouTube URL")
        raise ValueError("Invalid YouTube URL!")
    t1 = time.time()
    progress(f"✅ [COMPLETE] {step}: {t1-t0:.2f}s - N/A")

    step = "DOWNLOAD"
    t0 = time.time()
    progress(f"🔄 [STEP] {step}: Downloading video audio (10%)")
    ydl_opts = {
        'format': 'bestaudio/best',
        'quiet': True,
        'outtmpl': None,  # temp file
        'noplaylist': True,
        'no_warnings': True,
        'prefer_ffmpeg': True,
        'extractaudio': True,
        'cachedir': False,
        # Additional options to avoid blocking
        'extractor_retries': 3,
        'fragment_retries': 3,
        'retries': 3,
        'socket_timeout': 30,
        # Add comprehensive headers to avoid 403 errors
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-us,en;q=0.5',
            'Accept-Encoding': 'gzip,deflate',
            'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.7',
            'Keep-Alive': '300',
            'Connection': 'keep-alive',
        }
    }
    temp_dir = tempfile.mkdtemp(prefix="yt-audio-")
    temp_audio_path = os.path.join(temp_dir, "audio.%(ext)s")
    ydl_opts['outtmpl'] = temp_audio_path

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=True)
            downloaded_path = ydl.prepare_filename(info)
            t1 = time.time()
            size = os.path.getsize(downloaded_path)/1024/1024 if os.path.exists(downloaded_path) else 0
            progress(f"✅ [COMPLETE] {step}: {t1-t0:.2f}s - {size:.2f}MB")
            # Print metadata for the actual processed video
            print("\n--- VIDEO METADATA ---")
            print(f"Title: {info.get('title')}")
            print(f"Duration: {info.get('duration')} seconds ({info.get('duration')//60}:{info.get('duration')%60:02d})")
            print(f"Channel: {info.get('uploader')}")
            print(f"Views: {info.get('view_count'):,}")
            print(f"URL: {youtube_url}")
            print("-----------------------\n")
    except Exception as e:
        progress(f"❌ [ERROR] {step}: {e}")
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise RuntimeError(f"YouTube download error: {e}")

    step = "TIMESTAMP"
    t0 = time.time()
    progress(f"🔄 [STEP] {step}: Timestamp validation (30%)")
    try:
        start_sec = parse_timestamp(start_time)
        end_sec = parse_timestamp(end_time)
        if start_sec < 0 or end_sec <= start_sec:
            progress(f"❌ [ERROR] {step}: Invalid time interval: start time must be >= 0 and less than end time.")
            raise ValueError("Invalid time interval: start time must be >= 0 and less than end time.")
        video_length = int(info.get('duration', 0))
        if video_length == 0:
            progress(f"❌ [ERROR] {step}: Could not determine video length.")
            raise ValueError("Could not determine video length.")
        if start_sec >= video_length:
            progress(f"❌ [ERROR] {step}: Start time ({start_sec}s) is beyond video length ({video_length}s).")
            raise ValueError(f"Start time ({start_sec}s) is beyond video length ({video_length}s).")
        if end_sec > video_length:
            progress(f"❌ [ERROR] {step}: End time ({end_sec}s) is beyond video length ({video_length}s). Video duration: {video_length}s.")
            raise ValueError(f"End time ({end_sec}s) is beyond video length ({video_length}s). Video duration: {video_length}s.")
        t1 = time.time()
        progress(f"✅ [COMPLETE] {step}: {t1-t0:.2f}s - N/A")
    except Exception as e:
        progress(f"❌ [ERROR] {step}: {e}")
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise ValueError(f"Timestamp error: {e}")

    # 4. Audio segment cutting & format conversion (ffmpeg streaming)
    step = "FORMAT"
    t0 = time.time()
    progress(f"🔄 [STEP] {step}: Output format validation (50%)")
    output_ext = output_format.lower()
    if output_ext not in ("mp3", "wav"):
        progress(f"❌ [ERROR] {step}: Only mp3 or wav output formats are supported.")
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise ValueError("Only mp3 or wav output formats are supported.")
    output_path = os.path.join(temp_dir, f"output.{output_ext}")
    t1 = time.time()
    progress(f"✅ [COMPLETE] {step}: {t1-t0:.2f}s - {output_ext}")
    step = "EXTRACT"
    t0 = time.time()
    progress(f"🔄 [STEP] {step}: Audio extraction and conversion (70%)")
    try:
        process = (
            ffmpeg
            .input(downloaded_path, ss=start_sec, to=end_sec)
            .output(output_path, format=output_ext)
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
        t1 = time.time()
        size = os.path.getsize(output_path)/1024/1024 if os.path.exists(output_path) else 0
        progress(f"✅ [COMPLETE] {step}: {t1-t0:.2f}s - {size:.2f}MB")
    except ffmpeg.Error as e:
        err_msg = e.stderr.decode(errors='ignore') if hasattr(e, 'stderr') else str(e)
        progress(f"❌ [ERROR] {step}: {err_msg}")
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise RuntimeError(f"FFmpeg segmentation/conversion error: {err_msg}")
    except Exception as e:
        progress(f"❌ [ERROR] {step}: {e}")
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise RuntimeError(f"FFmpeg segmentation/conversion error: {e}")

    # 5. File output (return path + metadata)
    video_metadata = {
        "title": info.get('title'),
        "duration": info.get('duration'),
        "uploader": info.get('uploader'),
        "view_count": info.get('view_count')
    }
    return output_path, temp_dir, video_metadata

# --- Példa hívás ---
if __name__ == "__main__":
    import argparse
    import shutil, re
    parser = argparse.ArgumentParser(description="YouTube audio segment extractor")
    parser.add_argument("url", nargs="?", default="https://www.youtube.com/watch?v=mqLMPjeAWGQ&pp=0gcJCcYJAYcqIYzv", help="YouTube video URL")
    parser.add_argument("start", nargs="?", default="00:00", help="Start timestamp (e.g. 0:38 or 00:38)")
    parser.add_argument("end", nargs="?", default="00:05", help="End timestamp (e.g. 0:39 or 00:39)")
    parser.add_argument("--fmt", default="mp3", choices=["mp3", "wav"], help="Output format (mp3 or wav)")
    args = parser.parse_args()

    url = args.url
    start = args.start
    end = args.end
    fmt = args.fmt
    try:
        out_path, tmp_dir, video_metadata = extract_audio_segment(url, start, end, fmt)
        # --- OUTPUT MANAGEMENT ---
        os.makedirs("output", exist_ok=True)
        # Extract video ID from URL
        m = re.search(r"v=([\w-]+)", url)
        video_id = m.group(1) if m else "unknown"
        # Normalize timestamps for filename
        def ts_to_str(ts):
            if isinstance(ts, int): return str(ts)
            return str(ts).replace(":", "-")
        out_name = f"test_{video_id}_{ts_to_str(start)}-{ts_to_str(end)}.{fmt}"
        final_path = os.path.join("output", out_name)
        shutil.copy2(out_path, final_path)
        print(f"✅ Extraction successful: {final_path}")
        shutil.rmtree(tmp_dir, ignore_errors=True)
    except Exception as e:
        print(f"❌ Error: {e}")
