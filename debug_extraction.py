#!/usr/bin/env python3

"""
Debug script to test the extraction function locally
"""

import sys
import traceback
from tube_audio_extractor import extract_audio_segment

def test_extraction():
    print("🔍 Testing extract_audio_segment function...")
    print("=" * 50)
    
    try:
        # Test the function
        url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        start = "5"
        end = "8"
        format = "mp3"
        
        print(f"URL: {url}")
        print(f"Start: {start}, End: {end}, Format: {format}")
        print()
        
        print("Calling extract_audio_segment...")
        result = extract_audio_segment(url, start, end, format)
        
        print(f"Result type: {type(result)}")
        print(f"Result length: {len(result) if isinstance(result, tuple) else 'not tuple'}")
        print(f"Result: {result}")
        
        if isinstance(result, tuple):
            if len(result) == 2:
                output_path, temp_dir = result
                print(f"✅ 2-value return: path={output_path}, temp_dir={temp_dir}")
            elif len(result) == 3:
                output_path, temp_dir, metadata = result
                print(f"✅ 3-value return: path={output_path}, temp_dir={temp_dir}, metadata={metadata}")
            else:
                print(f"❌ Unexpected return count: {len(result)}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\nFull traceback:")
        traceback.print_exc()

if __name__ == "__main__":
    test_extraction()
