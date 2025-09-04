from sqlalchemy import (
    Column, String, Integer, DateTime, Boolean, ForeignKey, Text, create_engine, func
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from sqlalchemy.types import JSON
from datetime import datetime, timedelta
import os

Base = declarative_base()

class UserSession(Base):
    __tablename__ = 'sessions'
    session_id = Column(String, primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_active = Column(DateTime, default=datetime.utcnow)
    soundboard_config = Column(JSON, default=dict)
    preferences = Column(JSON, default=dict)
    extraction_quota = Column(Integer, default=0)
    quota_reset_time = Column(DateTime, default=datetime.utcnow)
    sounds = relationship('SoundRecord', cascade='all, delete-orphan', back_populates='session')
    layouts = relationship('SoundboardLayout', cascade='all, delete-orphan', back_populates='session')

class SoundRecord(Base):
    __tablename__ = 'sounds'
    id = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey('sessions.session_id', ondelete='CASCADE'))
    title = Column(String)
    youtube_url = Column(String)
    start_time = Column(String)
    end_time = Column(String)
    file_path = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    play_count = Column(Integer, default=0)
    is_favorite = Column(Boolean, default=False)
    session = relationship('UserSession', back_populates='sounds')

class SoundboardLayout(Base):
    __tablename__ = 'layouts'
    id = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey('sessions.session_id', ondelete='CASCADE'))
    name = Column(String)
    layout_data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_default = Column(Boolean, default=False)
    session = relationship('UserSession', back_populates='layouts')

# Database setup
DB_PATH = os.getenv('SOUNDBOARD_DB', 'soundboard.db')
engine = create_engine(f'sqlite:///{DB_PATH}', connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# Migration/init script

def init_db():
    Base.metadata.create_all(bind=engine)

def cleanup_expired_sessions(days=7):
    db = SessionLocal()
    cutoff = datetime.utcnow() - timedelta(days=days)
    expired = db.query(UserSession).filter(UserSession.last_active < cutoff).all()
    for session in expired:
        db.delete(session)  # cascades to sounds/layouts
    db.commit()
    db.close()

# Efficient queries

def get_user_sounds(session_id):
    db = SessionLocal()
    sounds = db.query(SoundRecord).filter_by(session_id=session_id).all()
    db.close()
    return sounds

def get_user_layouts(session_id):
    db = SessionLocal()
    layouts = db.query(SoundboardLayout).filter_by(session_id=session_id).all()
    db.close()
    return layouts

def get_storage_quota(session_id):
    db = SessionLocal()
    total = db.query(func.sum(func.length(SoundRecord.file_path))).filter_by(session_id=session_id).scalar() or 0
    db.close()
    return total

if __name__ == "__main__":
    init_db()
    cleanup_expired_sessions()
