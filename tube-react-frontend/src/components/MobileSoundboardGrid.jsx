import React from "react";
import "./MobileSoundboardGrid.css";

// MobileSoundboardGrid: Modern horror-inspired soundboard with mobile-first design
function MobileSoundboardGrid({ sounds, onPlay, onDelete }) {
  if (!sounds || sounds.length === 0) {
    return (
      <div className="soundboard-empty-state">
        <div className="soundboard-empty-icon">🎵</div>
        <div className="soundboard-empty-text">No sounds added yet</div>
        <div className="soundboard-empty-subtext">Add your first YouTube audio clip above</div>
      </div>
    );
  }

  return (
    <div className="soundboard-grid">
      {sounds.map((sound) => (
        <div key={sound.id} className="soundboard-grid-item">
          <div
            className={`soundboard-button ${sound.isPlaying ? 'playing' : ''} ${sound.isLoading ? 'loading' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => !sound.isLoading && onPlay(sound.id)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !sound.isLoading) {
                e.preventDefault();
                onPlay(sound.id);
              }
            }}
            aria-label={`Play ${sound.title}`}>
            
            {/* Delete button */}
            <div
              className="soundboard-delete-btn"
              role="button"
              tabIndex={0}
              aria-label={`Delete ${sound.title}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!sound.isLoading) onDelete(sound.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  e.preventDefault();
                  if (!sound.isLoading) onDelete(sound.id);
                }
              }}>
              <span className="soundboard-delete-icon">×</span>
            </div>

            {/* Loading spinner */}
            {sound.isLoading && <Spinner />}

            {/* Sound title */}
            <div className="soundboard-title">
              {sound.title || "Untitled"}
            </div>

            {/* Duration badge */}
            {sound.duration && (
              <div className="soundboard-duration">
                {sound.duration}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function Spinner() {
  return (
    <div className="soundboard-spinner">
      <div className="soundboard-spinner-dot" />
    </div>
  );
}

export default MobileSoundboardGrid;
