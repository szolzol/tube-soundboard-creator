#!/usr/bin/env python3

"""
Test Railway API with debugging
"""

import requests
import json
import time

def test_railway_api():
    base_url = "https://tubesoundboard-production.up.railway.app"
    
    print("🧪 Testing Railway API with Enhanced Debugging")
    print("=" * 60)
    
    # Test extraction
    payload = {
        "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "start_time": "5",
        "end_time": "8",
        "output_format": "mp3"
    }
    
    print(f"📤 Starting extraction...")
    print(f"📺 URL: {payload['youtube_url']}")
    print(f"⏰ Time: {payload['start_time']}s - {payload['end_time']}s")
    
    try:
        # Start job
        response = requests.post(f"{base_url}/extract", json=payload, timeout=60)
        response.raise_for_status()
        
        job_data = response.json()
        job_id = job_data["job_id"]
        print(f"✅ Job started: {job_id}")
        
        # Monitor progress
        for i in range(30):
            time.sleep(3)
            status_response = requests.get(f"{base_url}/status/{job_id}")
            status_response.raise_for_status()
            
            status = status_response.json()
            print(f"[{i+1}/30] Status: {status['status']} - {status.get('progress', 0)}%")
            
            if status.get("error"):
                print(f"\n❌ ERROR DETAILS:")
                print(f"Error: {status['error']}")
                print(f"\nThis will help us debug the Railway environment issue!")
                break
                
            if status["status"] == "done":
                print(f"\n🎉 SUCCESS!")
                print(f"File ID: {status['file_id']}")
                if status.get("result"):
                    print(f"Video Title: {status['result'].get('video_title', 'Unknown')}")
                print(f"\n✅ The Railway environment is working correctly!")
                break
        else:
            print(f"\n⏰ Timeout after 90 seconds")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    test_railway_api()
