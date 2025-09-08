import os
import json
import uuid
import tempfile
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

# Firebase imports
from firebase_functions import https_fn, options
from firebase_admin import initialize_app, storage, firestore
import firebase_admin

# Initialize Firebase
if not firebase_admin._apps:
    initialize_app()

# Initialize services
db = firestore.client()
bucket = storage.bucket()

# Create Flask app
flask_app = Flask(__name__)
CORS(flask_app, origins=["*"])

# --- Helper Functions ---
def upload_to_storage(file_path: str, destination_path: str) -> str:
    """Upload file to Firebase Storage and return public URL"""
    try:
        blob = bucket.blob(destination_path)
        blob.upload_from_filename(file_path)
        blob.make_public()
        return blob.public_url
    except Exception as e:
        print(f"Storage upload failed: {e}")
        return None

def save_to_firestore(collection: str, doc_id: str, data: dict):
    """Save data to Firestore"""
    try:
        doc_ref = db.collection(collection).document(doc_id)
        doc_ref.set({
            **data,
            'created_at': firestore.SERVER_TIMESTAMP
        })
        return True
    except Exception as e:
        print(f"Firestore save failed: {e}")
        return False

def get_from_firestore(collection: str, doc_id: str):
    """Get data from Firestore"""
    try:
        doc_ref = db.collection(collection).document(doc_id)
        doc = doc_ref.get()
        return doc.to_dict() if doc.exists else None
    except Exception as e:
        print(f"Firestore read failed: {e}")
        return None

# --- Flask Routes ---
@flask_app.route('/', methods=['GET'])
def root():
    return jsonify({
        "message": "Tube Soundboard API",
        "version": "1.0.0",
        "status": "active"
    })

@flask_app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    })

@flask_app.route('/video-info', methods=['POST'])
def video_info():
    """Get video information without downloading"""
    try:
        data = request.get_json()
        youtube_url = data.get('youtube_url')
        
        if not youtube_url:
            return jsonify({"error": "youtube_url is required"}), 400
        
        # Import yt-dlp
        import yt_dlp
        
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=False)
            
            return jsonify({
                "title": info.get('title', 'Unknown'),
                "duration": info.get('duration', 0),
                "uploader": info.get('uploader', 'Unknown'),
                "view_count": info.get('view_count', 0),
                "description": info.get('description', '')[:500] + '...' if info.get('description', '') else '',
            })
            
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@flask_app.route('/extract', methods=['POST'])
def extract_audio():
    """Start audio extraction job"""
    try:
        data = request.get_json()
        job_id = str(uuid.uuid4())
        
        # Save job to Firestore
        job_data = {
            "status": "queued",
            "progress": 0,
            "youtube_url": data.get('youtube_url'),
            "start_time": data.get('start_time'),
            "end_time": data.get('end_time'),
            "output_format": data.get('output_format', 'mp3')
        }
        
        save_to_firestore('jobs', job_id, job_data)
        
        # For now, return job_id - actual processing would be done by another function
        return jsonify({
            "job_id": job_id,
            "status": "queued",
            "message": "Job queued - processing will be implemented in next phase"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@flask_app.route('/status/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """Get job status"""
    try:
        job_data = get_from_firestore('jobs', job_id)
        
        if not job_data:
            return jsonify({"error": "Job not found"}), 404
        
        return jsonify({
            "job_id": job_id,
            **job_data
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@flask_app.route('/file/<file_id>', methods=['GET'])
def get_file_info(file_id):
    """Get file metadata"""
    try:
        file_data = get_from_firestore('audio_files', file_id)
        
        if not file_data:
            return jsonify({"error": "File not found"}), 404
        
        return jsonify(file_data)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- Firebase Cloud Function ---
@https_fn.on_request(
    cors=options.CorsOptions(
        cors_origins=["*"],
        cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        cors_allow_headers=["*"],
    ),
    memory=options.MemoryOption.GB_1,
    timeout_sec=540
)
def api(req: https_fn.Request) -> https_fn.Response:
    """Main Cloud Function entry point"""
    
    # Handle CORS preflight
    if req.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "3600",
        }
        return https_fn.Response("", status=200, headers=headers)
    
    # Process the request through Flask
    with flask_app.test_request_context(
        path=req.path,
        method=req.method,
        headers=dict(req.headers),
        data=req.data,
        query_string=req.query_string
    ):
        try:
            response = flask_app.full_dispatch_request()
            
            # Convert Flask response to Firebase response
            return https_fn.Response(
                response.get_data(),
                status=response.status_code,
                headers={
                    **dict(response.headers),
                    "Access-Control-Allow-Origin": "*"
                }
            )
        except Exception as e:
            return https_fn.Response(
                json.dumps({"error": str(e)}),
                status=500,
                headers={
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*"
                }
            )
