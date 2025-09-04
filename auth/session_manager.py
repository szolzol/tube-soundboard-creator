import uuid
import json
from datetime import datetime, timedelta
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import sqlite3

SESSION_COOKIE = "sb_session"
SESSION_TTL = 60 * 60 * 24 * 30  # 30 nap
RATE_LIMIT = 100  # napi 100 extraction
DB_PATH = "sessions.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as db:
        db.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            created_at TEXT,
            last_active TEXT,
            soundboard_config TEXT,
            extraction_quota_used INTEGER,
            preferences TEXT
        )
        """)
        # --- Migration: add extraction_count and quota_reset_time if missing ---
        cols = [row[1] for row in db.execute("PRAGMA table_info(sessions)")]
        if "extraction_count" not in cols:
            db.execute("ALTER TABLE sessions ADD COLUMN extraction_count INTEGER DEFAULT 0")
        if "quota_reset_time" not in cols:
            db.execute("ALTER TABLE sessions ADD COLUMN quota_reset_time TEXT")
init_db()

def create_anonymous_session():
    session_id = str(uuid.uuid4())
    now = datetime.utcnow()
    quota_reset_time = now + timedelta(hours=1)
    session = {
        "session_id": session_id,
        "created_at": now.isoformat(),
        "last_active": now.isoformat(),
        "soundboard_config": {},
        "extraction_quota_used": 0,
        "preferences": {"theme": "light", "layout": "grid"},
        "extraction_count": 0,
        "quota_reset_time": quota_reset_time.isoformat()
    }
    with get_db() as db:
        db.execute(
            """
            INSERT INTO sessions (session_id, created_at, last_active, soundboard_config, extraction_quota_used, preferences, extraction_count, quota_reset_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session_id,
                now.isoformat(),
                now.isoformat(),
                json.dumps(session["soundboard_config"]),
                session["extraction_quota_used"],
                json.dumps(session["preferences"]),
                0,
                quota_reset_time.isoformat()
            )
        )
    return session

def get_session_from_cookie(session_id):
    if not session_id:
        return None
    with get_db() as db:
        row = db.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,)).fetchone()
        if row:
            session = dict(row)
            session["soundboard_config"] = json.loads(session["soundboard_config"])
            session["preferences"] = json.loads(session["preferences"])
            # Ensure extraction_count and quota_reset_time are always present and valid
            if session.get("extraction_count") is None:
                session["extraction_count"] = 0
            else:
                try:
                    session["extraction_count"] = int(session["extraction_count"])
                except Exception:
                    session["extraction_count"] = 0
            if not session.get("quota_reset_time"):
                from datetime import datetime, timedelta
                session["quota_reset_time"] = (datetime.utcnow() + timedelta(hours=1)).isoformat()
            return session
    return None

def update_session_data(session_id, **kwargs):
    fields = []
    values = []
    for k, v in kwargs.items():
        if k in ["soundboard_config", "preferences"]:
            v = json.dumps(v)
        fields.append(f"{k} = ?")
        values.append(v)
    values.append(datetime.utcnow().isoformat())
    values.append(session_id)
    with get_db() as db:
        if fields:
            sql = f"UPDATE sessions SET {', '.join(fields)}, last_active = ? WHERE session_id = ?"
        else:
            sql = "UPDATE sessions SET last_active = ? WHERE session_id = ?"
        db.execute(sql, values)

def cleanup_expired_sessions():
    cutoff = (datetime.utcnow() - timedelta(seconds=SESSION_TTL)).isoformat()
    with get_db() as db:
        db.execute("DELETE FROM sessions WHERE last_active < ?", (cutoff,))

class SessionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        session_id = request.cookies.get(SESSION_COOKIE)
        session = get_session_from_cookie(session_id)
        if not session:
            session = create_anonymous_session()
            response = await call_next(request)
            response.set_cookie(
                SESSION_COOKIE,
                session["session_id"],
                max_age=SESSION_TTL,
                httponly=True,
                samesite="lax"
            )
            request.state.session = session
            return response
        else:
            # Rate limiting példa
            if session["extraction_quota_used"] >= RATE_LIMIT:
                return JSONResponse({"error": "Rate limit exceeded"}, status_code=429)
            update_session_data(session["session_id"])  # Frissítsd last_active-ot
            request.state.session = session
            response = await call_next(request)
            return response

# FastAPI app-hoz:
# from auth.session_manager import SessionMiddleware
# app.add_middleware(SessionMiddleware)
