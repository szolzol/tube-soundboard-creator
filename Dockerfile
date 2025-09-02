# Cloud-ready Dockerfile for YouTube Audio Extraction Agent
FROM python:3.12-slim

# Install ffmpeg and system dependencies
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Set workdir
WORKDIR /app

# Copy requirements
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Default command (can be overridden)
CMD ["python", "youtube_audio_test.py"]
