# Railway deployment script
# This ensures FFmpeg is available in the Railway environment

import subprocess
import sys
import os

def install_ffmpeg():
    """Install FFmpeg in Railway environment"""
    try:
        # Check if ffmpeg is already available
        result = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
        print("✅ FFmpeg is already installed")
        print(f"FFmpeg version: {result.stdout.split()[2] if result.stdout else 'unknown'}")
        return True
    except FileNotFoundError:
        print("❌ FFmpeg not found, attempting to install...")
        
        # Try to install ffmpeg using apt (Railway uses Ubuntu)
        try:
            subprocess.run(['apt-get', 'update'], check=True)
            subprocess.run(['apt-get', 'install', '-y', 'ffmpeg'], check=True)
            print("✅ FFmpeg installed successfully")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install FFmpeg: {e}")
            return False
        except FileNotFoundError:
            print("❌ apt-get not available (not Ubuntu/Debian)")
            return False

def main():
    print("🚀 Railway deployment setup")
    print("=" * 40)
    
    # Check Python version
    print(f"🐍 Python version: {sys.version}")
    
    # Check environment
    print(f"🌍 Environment: {os.environ.get('RAILWAY_ENVIRONMENT', 'local')}")
    print(f"📁 Current directory: {os.getcwd()}")
    
    # Install FFmpeg if needed
    install_ffmpeg()
    
    # Start the application
    print("🚀 Starting FastAPI application...")
    os.system("uvicorn main:app --host 0.0.0.0 --port $PORT")

if __name__ == "__main__":
    main()
