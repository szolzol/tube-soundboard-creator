#!/usr/bin/env python3
"""
Test Railway deployment version and debug info
"""
import requests
import json

API_BASE = "https://tubesoundboard-production.up.railway.app"

def test_version():
    print("🔍 Checking Railway deployment version...")
    try:
        response = requests.get(f"{API_BASE}/debug/version", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Git Commit: {data['git_commit']}")
            print(f"✅ Extract Function File: {data['extract_function_file']}")
            print(f"✅ Python Version: {data['python_version']}")
            print(f"✅ Working Directory: {data['working_directory']}")
            print(f"✅ Deployment: {data['deployment_timestamp']}")
            return True
        else:
            print(f"❌ Version check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_extract_debug():
    print("\n🧪 Testing extract function debug...")
    try:
        response = requests.get(f"{API_BASE}/debug/test-extract", timeout=60)
        if response.status_code == 200:
            data = response.json()
            if data['test_successful']:
                print(f"✅ Function Signature: {data['function_signature']}")
                print(f"✅ Result Type: {data['result_type']}")
                print(f"✅ Result Length: {data['result_length']}")
                print(f"✅ Result Value Types: {data['result_values']}")
            else:
                print(f"❌ Test failed: {data.get('error', 'Unknown error')}")
            return data['test_successful']
        else:
            print(f"❌ Debug test failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Railway Deployment Debug")
    print("=" * 50)
    
    version_ok = test_version()
    if version_ok:
        test_extract_debug()
    
    print("\n" + "=" * 50)
