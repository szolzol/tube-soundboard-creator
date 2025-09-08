from sqlalchemy import (
    Column, String, Integer, DateTime, Boolean, ForeignKey, Text, create_engine, func
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from sqlalchemy.types import JSON
from datetime import datetime, timedelta
import os

Base = declarative_base()

from sqlalchemy import CheckConstraint

class User(Base):
    __tablename__ = 'users'
    id = Column(String, primary_key=True)  # Google User ID
    email = Column(String, unique=True, nullable=False)
    name = Column(String)
    picture_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    sounds = relationship('SoundRecord', cascade='all, delete-orphan', back_populates='user')
    layouts = relationship('SoundboardLayout', cascade='all, delete-orphan', back_populates='user')

class UserSession(Base):
    __tablename__ = 'sessions'
    session_id = Column(String, primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_active = Column(DateTime, default=datetime.utcnow)
    extraction_quota = Column(Integer, default=10)
    quota_reset_time = Column(DateTime, default=datetime.utcnow)
    sounds = relationship('SoundRecord', cascade='all, delete-orphan', back_populates='session')
    layouts = relationship('SoundboardLayout', cascade='all, delete-orphan', back_populates='session')

class SoundRecord(Base):
    __tablename__ = 'sounds'
    __table_args__ = (CheckConstraint('(user_id IS NOT NULL AND session_id IS NULL) OR (user_id IS NULL AND session_id IS NOT NULL)'),)
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    session_id = Column(String, ForeignKey('sessions.session_id', ondelete='CASCADE'), nullable=True)
    title = Column(String)
    youtube_url = Column(String)
    start_time = Column(String)
    end_time = Column(String)
    storage_url = Column(String)  # URL to the file in cloud storage
    thumbnail_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    play_count = Column(Integer, default=0)
    is_favorite = Column(Boolean, default=False)
    user = relationship('User', back_populates='sounds')
    session = relationship('UserSession', back_populates='sounds')

class SoundboardLayout(Base):
    __tablename__ = 'layouts'
    __table_args__ = (CheckConstraint('(user_id IS NOT NULL AND session_id IS NULL) OR (user_id IS NULL AND session_id IS NOT NULL)'),)
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    session_id = Column(String, ForeignKey('sessions.session_id', ondelete='CASCADE'), nullable=True)
    name = Column(String)
    layout_data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_default = Column(Boolean, default=False)
    user = relationship('User', back_populates='layouts')
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
        db.delete(session)
    db.commit()
    db.close()

# Efficient queries

def get_sounds_for_owner(db, user_id=None, session_id=None):
    if user_id:
        return db.query(SoundRecord).filter_by(user_id=user_id).all()
    if session_id:
        return db.query(SoundRecord).filter_by(session_id=session_id).all()
    return []

def get_layouts_for_owner(db, user_id=None, session_id=None):
    if user_id:
        return db.query(SoundboardLayout).filter_by(user_id=user_id).all()
    if session_id:
        return db.query(SoundboardLayout).filter_by(session_id=session_id).all()
    return []

if __name__ == "__main__":
    init_db()
    cleanup_expired_sessions()
