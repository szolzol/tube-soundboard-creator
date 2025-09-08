#!/usr/bin/env python3
"""
Quick test script to verify YouTube 403 protection is working
"""
import requests
import json
import time

API_BASE = "https://tubesoundboard-production.up.railway.app"

def test_video_info():
    print("🧪 Testing video info endpoint...")
    try:
        response = requests.post(f"{API_BASE}/video-info", 
                               json={"youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
                               timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ SUCCESS: {data['title']}")
            print(f"   Duration: {data['duration']} ({data['duration_seconds']} seconds)")
            print(f"   Views: {data['view_count']:,}")
            return True
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_extraction():
    print("\n🧪 Testing audio extraction...")
    try:
        # Start extraction
        response = requests.post(f"{API_BASE}/extract", 
                               json={
                                   "youtube_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                                   "start_time": "5",
                                   "end_time": "8", 
                                   "output_format": "mp3"
                               },
                               timeout=30)
        
        if response.status_code != 200:
            print(f"❌ Failed to start: {response.status_code} - {response.text}")
            return False
            
        job_id = response.json()["job_id"]
        print(f"✅ Job started: {job_id}")
        
        # Monitor progress
        for i in range(20):
            time.sleep(3)
            status_response = requests.get(f"{API_BASE}/status/{job_id}", timeout=10)
            
            if status_response.status_code != 200:
                print(f"❌ Status check failed: {status_response.status_code}")
                return False
                
            status = status_response.json()
            print(f"[{i+1}/20] {status['status']} - {status.get('progress', 0)}%")
            
            if status.get("error"):
                print(f"❌ EXTRACTION FAILED: {status['error']}")
                return False
                
            if status["status"] == "done":
                print(f"✅ EXTRACTION SUCCESS!")
                print(f"   File ID: {status['file_id']}")
                if status.get("result", {}).get("video_title"):
                    print(f"   Video Title: {status['result']['video_title']}")
                return True
                
        print("⏰ Timeout reached")
        return False
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Testing YouTube 403 Protection Fix")
    print("=" * 50)
    
    # Test video info first
    video_info_success = test_video_info()
    
    if video_info_success:
        # Test extraction
        extraction_success = test_extraction()
        
        print("\n" + "=" * 50)
        if extraction_success:
            print("🎉 ALL TESTS PASSED!")
            print("✅ YouTube 403 Forbidden error is FIXED!")
            print("✅ Your frontend should now work properly!")
        else:
            print("❌ Extraction test failed")
    else:
        print("❌ Video info test failed - YouTube protection may not be working")
