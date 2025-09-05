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
    Returns: (audio_path, screenshot_path, thumbnail_path, temp_dir)
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
    
    # Enhanced YouTube URL validation to support both youtube.com and youtu.be formats
    import re
    youtube_patterns = [
        r'https?://(?:www\.)?youtube\.com/watch\?v=[\w-]+',
        r'https?://(?:www\.)?youtu\.be/[\w-]+',
        r'https?://(?:m\.)?youtube\.com/watch\?v=[\w-]+',
        r'https?://youtube\.com/watch\?v=[\w-]+'
    ]
    
    is_youtube_url = any(re.match(pattern, youtube_url) for pattern in youtube_patterns)
    
    if not validators.url(youtube_url) or not is_youtube_url:
        progress(f"❌ [ERROR] {step}: Invalid YouTube URL - must be youtube.com or youtu.be")
        raise ValueError("Invalid YouTube URL! Must be a valid YouTube or youtu.be URL")
    
    t1 = time.time()
    progress(f"✅ [COMPLETE] {step}: {t1-t0:.2f}s - URL format validated")

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
        'cachedir': False
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
            
            # Extract YouTube thumbnail
            thumbnail_path = None
            if info.get('thumbnail'):
                step_thumb = "THUMBNAIL"
                t0_thumb = time.time()
                progress(f"🔄 [STEP] {step_thumb}: Downloading YouTube thumbnail (15%)")
                try:
                    import urllib.request
                    thumbnail_url = info.get('thumbnail')
                    thumbnail_path = os.path.join(temp_dir, "thumbnail.jpg")
                    print(f"DEBUG: Downloading thumbnail from: {thumbnail_url}")
                    print(f"DEBUG: Saving thumbnail to: {thumbnail_path}")
                    urllib.request.urlretrieve(thumbnail_url, thumbnail_path)
                    t1_thumb = time.time()
                    thumb_size = os.path.getsize(thumbnail_path)/1024 if os.path.exists(thumbnail_path) else 0
                    print(f"DEBUG: Thumbnail file exists: {os.path.exists(thumbnail_path)}, size: {thumb_size:.2f}KB")
                    progress(f"✅ [COMPLETE] {step_thumb}: {t1_thumb-t0_thumb:.2f}s - {thumb_size:.2f}KB")
                except Exception as e:
                    print(f"DEBUG: Thumbnail extraction failed: {e}")
                    progress(f"⚠️ [WARNING] {step_thumb}: Failed to download thumbnail: {e}")
                    thumbnail_path = None
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

    # 4. Screenshot extraction at start timestamp
    step = "SCREENSHOT"
    t0 = time.time()
    progress(f"🔄 [STEP] {step}: Extracting screenshot at start timestamp (40%)")
    screenshot_path = None
    try:
        screenshot_path = os.path.join(temp_dir, "screenshot.jpg")
        print(f"DEBUG: Extracting screenshot from: {downloaded_path}")
        print(f"DEBUG: Screenshot timestamp: {start_sec}s")
        print(f"DEBUG: Saving screenshot to: {screenshot_path}")
        process = (
            ffmpeg
            .input(downloaded_path, ss=start_sec)
            .output(
                screenshot_path,
                vframes=1,
                format='image2',
                vf='scale=640:360'  # Standard resolution for screenshots
            )
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
        t1 = time.time()
        screenshot_size = os.path.getsize(screenshot_path)/1024 if os.path.exists(screenshot_path) else 0
        print(f"DEBUG: Screenshot file exists: {os.path.exists(screenshot_path)}, size: {screenshot_size:.2f}KB")
        progress(f"✅ [COMPLETE] {step}: {t1-t0:.2f}s - {screenshot_size:.2f}KB")
    except ffmpeg.Error as e:
        err_msg = e.stderr.decode(errors='ignore') if hasattr(e, 'stderr') else str(e)
        print(f"DEBUG: Screenshot extraction failed: {err_msg}")
        progress(f"⚠️ [WARNING] {step}: Failed to extract screenshot: {err_msg}")
        screenshot_path = None
    except Exception as e:
        print(f"DEBUG: Screenshot extraction failed: {e}")
        progress(f"⚠️ [WARNING] {step}: Failed to extract screenshot: {e}")
        screenshot_path = None

    # 5. Audio segment cutting & format conversion (ffmpeg streaming)
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
        # Hang normalizáció és kompresszió filterlánc
        afilter = "loudnorm=I=-16:TP=-1.5:LRA=11,acompressor=threshold=-20dB:ratio=3:attack=20:release=250"
        process = (
            ffmpeg
            .input(downloaded_path, ss=start_sec, to=end_sec)
            .output(
                output_path,
                format=output_ext,
                af=afilter
            )
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
        t1 = time.time()
        size = os.path.getsize(output_path)/1024/1024 if os.path.exists(output_path) else 0
        progress(f"✅ [COMPLETE] {step}: {t1-t0:.2f}s - {size:.2f}MB (normalizált)")
    except ffmpeg.Error as e:
        err_msg = e.stderr.decode(errors='ignore') if hasattr(e, 'stderr') else str(e)
        progress(f"❌ [ERROR] {step}: {err_msg}")
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise RuntimeError(f"FFmpeg segmentation/conversion error: {err_msg}")
    except Exception as e:
        progress(f"❌ [ERROR] {step}: {e}")
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise RuntimeError(f"FFmpeg segmentation/conversion error: {e}")

    # 6. File output (return paths and metadata)
    video_metadata = {
        'title': info.get('title', 'Untitled'),
        'duration': info.get('duration', 0),
        'uploader': info.get('uploader', 'Unknown'),
        'view_count': info.get('view_count', 0)
    }
    return output_path, screenshot_path, thumbnail_path, video_metadata, temp_dir

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
        out_path, screenshot_path, thumbnail_path, video_metadata, tmp_dir = extract_audio_segment(url, start, end, fmt)
        # --- OUTPUT MANAGEMENT ---
        os.makedirs("output", exist_ok=True)
        # Extract video ID from URL
        m = re.search(r"v=([\w-]+)", url)
        video_id = m.group(1) if m else "unknown"
        # Normalize timestamps for filename
        def ts_to_str(ts):
            if isinstance(ts, int): return str(ts)
            return str(ts).replace(":", "-")
        
        # Copy audio file
        out_name = f"test_{video_id}_{ts_to_str(start)}-{ts_to_str(end)}.{fmt}"
        final_path = os.path.join("output", out_name)
        shutil.copy2(out_path, final_path)
        print(f"✅ Audio extraction successful: {final_path}")
        
        # Copy screenshot if available
        if screenshot_path and os.path.exists(screenshot_path):
            screenshot_name = f"test_{video_id}_{ts_to_str(start)}-{ts_to_str(end)}_screenshot.jpg"
            screenshot_final = os.path.join("output", screenshot_name)
            shutil.copy2(screenshot_path, screenshot_final)
            print(f"✅ Screenshot saved: {screenshot_final}")
        
        # Copy thumbnail if available
        if thumbnail_path and os.path.exists(thumbnail_path):
            thumbnail_name = f"test_{video_id}_thumbnail.jpg"
            thumbnail_final = os.path.join("output", thumbnail_name)
            shutil.copy2(thumbnail_path, thumbnail_final)
            print(f"✅ Thumbnail saved: {thumbnail_final}")
        
        shutil.rmtree(tmp_dir, ignore_errors=True)
    except Exception as e:
        print(f"❌ Error: {e}")
