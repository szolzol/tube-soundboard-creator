# Automated error handling tests for YouTube audio extraction
from tube_audio_extractor import extract_audio_segment

TESTS = [
    {"desc": "Unavailable video", "url": "https://www.youtube.com/watch?v=xxxxxxxxxxx", "start": "0:00", "end": "0:10", "fmt": "mp3"},
    {"desc": "Private video", "url": "https://www.youtube.com/watch?v=QH2-TGUlwu4", "start": "0:00", "end": "0:10", "fmt": "mp3"},
    {"desc": "Too long video (>2h)", "url": "https://www.youtube.com/watch?v=21X5lGlDOfg", "start": "0:00", "end": "2:10:00", "fmt": "mp3"},
    {"desc": "Bad timestamp format", "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "start": "badtime", "end": "0:10", "fmt": "mp3"},
    {"desc": "Start > End time", "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "start": "0:20", "end": "0:10", "fmt": "mp3"},
    {"desc": "Timestamp beyond video length", "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "start": "0:00", "end": "0:999", "fmt": "mp3"},
]

def run_test(test):
    print(f"\n--- {test['desc']} ---")
    try:
        out_path, tmp_dir = extract_audio_segment(test['url'], test['start'], test['end'], test['fmt'])
        print(f"❌ Unexpected success: {out_path}")
    except Exception as e:
        print(f"✅ Correctly failed: {e}")

if __name__ == "__main__":
    for t in TESTS:
        run_test(t)
