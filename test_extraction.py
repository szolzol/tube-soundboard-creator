# Automated tests for YouTube audio extraction edge cases
import os
from tube_audio_extractor import extract_audio_segment

TEST_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

TESTS = [
    {"desc": "Segment at start (0:00-0:15)", "start": "0:00", "end": "0:15", "fmt": "mp3"},
    {"desc": "Segment at end (last 30 seconds)", "start": 183, "end": 213, "fmt": "mp3"},
    {"desc": "Very short segment (5 seconds)", "start": "1:00", "end": "1:05", "fmt": "mp3"},
    {"desc": "Long segment (10+ min, expect error)", "start": "0:00", "end": 700, "fmt": "mp3"},
    {"desc": "Overlapping segment 1", "start": "0:10", "end": "0:20", "fmt": "mp3"},
    {"desc": "Overlapping segment 2", "start": "0:15", "end": "0:25", "fmt": "mp3"},
]

def run_test(test):
    print(f"\n--- {test['desc']} ---")
    try:
        out_path, tmp_dir = extract_audio_segment(TEST_URL, test['start'], test['end'], test['fmt'])
        size = os.path.getsize(out_path) / 1024
        print(f"✅ Success: {out_path} ({size:.1f} KB)")
        # Clean up
        import shutil
        shutil.rmtree(tmp_dir, ignore_errors=True)
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    for t in TESTS:
        run_test(t)
