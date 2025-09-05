import React, { useState, useRef, useEffect } from 'react';
import './SoundboardGrid.css';

// Component to handle thumbnail/screenshot background with fallback
const ThumbnailBackground = ({ thumbnailUrl, screenshotUrl }) => {
  const [imageUrl, setImageUrl] = useState(thumbnailUrl || screenshotUrl);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!thumbnailUrl && !screenshotUrl) return;
    
    // Try thumbnail first, fallback to screenshot
    const testImage = new Image();
    testImage.onload = () => {
      setImageUrl(thumbnailUrl || screenshotUrl);
      setHasError(false);
    };
    testImage.onerror = () => {
      console.log('Thumbnail failed, trying screenshot:', thumbnailUrl);
      if (screenshotUrl && thumbnailUrl !== screenshotUrl) {
        const testScreenshot = new Image();
        testScreenshot.onload = () => {
          setImageUrl(screenshotUrl);
          setHasError(false);
        };
        testScreenshot.onerror = () => {
          console.log('Screenshot also failed:', screenshotUrl);
          setHasError(true);
        };
        testScreenshot.src = screenshotUrl;
      } else {
        setHasError(true);
      }
    };
    testImage.src = thumbnailUrl || screenshotUrl;
  }, [thumbnailUrl, screenshotUrl]);

  if (hasError) return null;

  return (
    <div 
      className="sound-thumbnail"
      style={{ backgroundImage: `url(${imageUrl})` }}
    />
  );
};

// Utility function to truncate title with character limit
const truncateTitle = (title, maxLength = 50) => {
  if (!title || title.length <= maxLength) return title;
  return title.substring(0, maxLength) + "...";
};

function SoundboardGrid({ sounds, onPlay, onDelete, onReorder, onRename }) {
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const longPressTimer = useRef(null);
  const isDragging = useRef(false);
  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverIndex(null);
    isDragging.current = false;
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedItem === null || draggedItem === dropIndex) {
      handleDragEnd();
      return;
    }

    const newSounds = [...sounds];
    
    // Swap mechanic: exchange positions of dragged item and drop target
    const draggedSound = newSounds[draggedItem];
    const targetSound = newSounds[dropIndex];
    
    newSounds[draggedItem] = targetSound;
    newSounds[dropIndex] = draggedSound;
    
    onReorder(newSounds);
    handleDragEnd();
  };

  // Mobile touch handlers
  const handleTouchStart = (e, index) => {
    const touch = e.touches[0];
    dragStartPos.current = { x: touch.clientX, y: touch.clientY };
    
    longPressTimer.current = setTimeout(() => {
      isDragging.current = true;
      setDraggedItem(index);
      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500); // 500ms long press
  };

  const handleTouchMove = (e, index) => {
    if (!isDragging.current) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - dragStartPos.current.x);
      const deltaY = Math.abs(touch.clientY - dragStartPos.current.y);
      
      // Cancel long press if moved too much
      if (deltaX > 10 || deltaY > 10) {
        clearTimeout(longPressTimer.current);
      }
      return;
    }

    e.preventDefault();
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const soundButton = element?.closest('.sound-button');
    
    if (soundButton) {
      const allButtons = Array.from(document.querySelectorAll('.sound-button'));
      const overIndex = allButtons.indexOf(soundButton);
      if (overIndex !== -1 && overIndex !== index) {
        setDragOverIndex(overIndex);
      }
    }
  };

  const handleTouchEnd = (e, index) => {
    clearTimeout(longPressTimer.current);
    
    if (isDragging.current && dragOverIndex !== null && dragOverIndex !== index) {
      handleDrop(e, dragOverIndex);
    } else {
      handleDragEnd();
    }
  };

  if (!sounds || sounds.length === 0) {
    return (
      <div className="soundboard-empty">
        <div className="empty-icon">🎵</div>
        <h3 className="empty-title">No sounds yet</h3>
        <p className="empty-subtitle">Add your first YouTube audio clip above</p>
      </div>
    );
  }

  return (
    <div className="soundboard-grid">
      {sounds.map((sound, index) => (
        <SoundButton
          key={sound.id}
          sound={sound}
          index={index}
          onPlay={onPlay}
          onDelete={onDelete}
          onRename={onRename}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDrop={handleDrop}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          isDragged={draggedItem === index}
          isDragOver={dragOverIndex === index}
        />
      ))}
    </div>
  );
}

function SoundButton({ 
  sound, 
  index, 
  onPlay, 
  onDelete, 
  onRename,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  isDragged,
  isDragOver
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(sound.title || "Untitled");
  const handlePlay = (e) => {
    // Don't play if we're in the middle of a drag operation
    if (isDragged || e.defaultPrevented) {
      return;
    }
    if (!sound.isLoading) {
      onPlay(sound.id);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (!sound.isLoading) {
      onDelete(sound.id);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === " ") && !sound.isLoading && !isEditing) {
      e.preventDefault();
      onPlay(sound.id);
    }
  };

  const handleTitleClick = (e) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleTitleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (editTitle.trim() && editTitle !== sound.title) {
      onRename(sound.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleTitleKeyDown = (e) => {
    e.stopPropagation(); // Prevent event bubbling to parent
    if (e.key === 'Enter') {
      handleTitleSubmit(e);
    } else if (e.key === 'Escape') {
      setEditTitle(sound.title || "Untitled");
      setIsEditing(false);
    }
  };

  const handleTitleBlur = (e) => {
    handleTitleSubmit(e);
  };

  return (
    <div
      className={`sound-button ${
        sound.isPlaying ? "playing" : ""
      } ${
        sound.isLoading ? "loading" : ""
      } ${
        isDragged ? "dragged" : ""
      } ${
        isDragOver ? "drag-over" : ""
      }`}
      draggable={!sound.isLoading}
      onClick={handlePlay}
      onKeyDown={handleKeyDown}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, index)}
      onTouchStart={(e) => onTouchStart(e, index)}
      onTouchMove={(e) => onTouchMove(e, index)}
      onTouchEnd={(e) => onTouchEnd(e, index)}
      tabIndex={0}
      role="button"
      aria-label={`Play ${sound.title}`}
    >
      {/* Delete button */}
      <button
        className="delete-button"
        onClick={handleDelete}
        aria-label={`Delete ${sound.title}`}
        tabIndex={-1}
      >
        ×
      </button>

      {/* Loading spinner */}
      {sound.isLoading && (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      )}

      {/* Thumbnail background */}
      {(sound.thumbnailUrl || sound.screenshotUrl) && (
        <ThumbnailBackground 
          thumbnailUrl={sound.thumbnailUrl}
          screenshotUrl={sound.screenshotUrl}
        />
      )}

      {/* Play icon - bottom left corner */}
      {!sound.isPlaying && !sound.isLoading && (
        <div className="play-icon" />
      )}

      {/* Sound content */}
      <div className="sound-content">
        {isEditing ? (
          <input
            type="text"
            className="sound-title-input"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            onBlur={handleTitleBlur}
            autoFocus
            maxLength={50}
          />
        ) : (
          <div 
            className="sound-title" 
            onClick={handleTitleClick}
            title={sound.title}
          >
            {truncateTitle(sound.title)}
          </div>
        )}
      </div>

      {/* Playing indicator */}
      {sound.isPlaying && (
        <div className="playing-indicator">
          <div className="wave"></div>
          <div className="wave"></div>
          <div className="wave"></div>
        </div>
      )}
    </div>
  );
}

export default SoundboardGrid;
