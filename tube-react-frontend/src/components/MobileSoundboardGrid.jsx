import React from "react";

// MobileSoundboardGrid: Responsive grid for soundboard buttons, no nested <button>
function MobileSoundboardGrid({ sounds, onPlay, onDelete }) {
  return (
    <div className="soundboard-grid">
      {sounds.map((sound) => (
        <div
          key={sound.id}
          className="soundboard-btn"
          style={{
            background: "var(--sb-soundboard-btn-bg, #fff)",
            color: "var(--sb-soundboard-btn-color, #222)",
            borderRadius: "14px",
            margin: "8px 12px",
            padding: "12px",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
          role="button"
          tabIndex={0}
          onClick={() => onPlay(sound.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onPlay(sound.id);
          }}
          aria-label={`Play ${sound.title}`}>
          <span
            className="soundboard-btn-label"
            style={{ fontWeight: 600, fontSize: 16 }}>
            {sound.title}
          </span>
          <span
            className="soundboard-btn-delete"
            style={{
              background: "#e53935",
              color: "#fff",
              marginLeft: "8px",
              borderRadius: "50%",
              padding: "2px 6px",
              cursor: "pointer",
              display: "inline-block",
            }}
            role="button"
            tabIndex={0}
            aria-label={`Delete ${sound.title}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(sound.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                onDelete(sound.id);
              }
            }}>
            &#x2716;
          </span>
        </div>
      ))}
    </div>
  );
}
// ...existing code...
export default MobileSoundboardGrid;

// ...existing code...

function Spinner() {
  return (
    <div style={styles.spinner}>
      <div style={styles.spinnerDot} />
    </div>
  );
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
    gap: 20,
    padding: 12,
    background: "none",
    borderRadius: 0,
    minHeight: 180,
    fontFamily: "Montserrat, Arial, sans-serif",
    justifyItems: "center",
    alignItems: "center",
    width: "100%",
    boxSizing: "border-box",
  },
  gridItem: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  },
  button: {
    background:
      "var(--sb-btn-bg, linear-gradient(180deg, #232323 80%, #2c2c2c 100%))",
    color: "var(--sb-btn-color, #fff)",
    border: "2px solid var(--sb-grid-border, var(--sb-btn-border, #333))",
    borderRadius: 14,
    width: "100%",
    aspectRatio: "1 / 1",
    maxWidth: "120px",
    minWidth: "80px",
    minHeight: "80px",
    fontSize: 17,
    fontWeight: 600,
    padding: "12px 10px 10px 10px",
    textAlign: "left",
    position: "relative",
    boxShadow: "var(--sb-grid-shadow, 0 2px 8px #0006), 0 0 0 1px #3332 inset",
    transition:
      "background 0.2s, border 0.2s, color 0.2s, box-shadow 0.2s, transform 0.1s",
    outline: "none",
    cursor: "pointer",
    overflow: "hidden",
    userSelect: "none",
    letterSpacing: "0.5px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 2,
    boxSizing: "border-box",
  },
  deleteBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    background: "var(--sb-btn-delete-bg, #2c2c2c)",
    color: "var(--sb-btn-delete-color, #fff)",
    border: "none",
    borderRadius: "50%",
    width: 24,
    height: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    opacity: 0.85,
    boxShadow: "0 1px 4px #0006",
    transition: "background 0.2s, opacity 0.2s",
    zIndex: 2,
    fontSize: 16,
  },
  deleteIcon: {
    fontWeight: 700,
    fontSize: 16,
    lineHeight: 1,
    color: "inherit",
  },
  playing: {
    border: "2px solid var(--sb-btn-playing, #e53935)",
    background:
      "var(--sb-btn-playing-bg, linear-gradient(180deg, #2a1818 80%, #3a2222 100%))",
    color: "var(--sb-btn-playing-color, #ffeaea)",
    boxShadow: "0 0 0 2px #e53935, 0 2px 12px #000a",
    transform: "scale(1.03)",
  },
  loading: {
    opacity: 0.6,
    pointerEvents: "none",
  },
  title: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    marginBottom: 8,
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: "0.5px",
    textShadow: "0 1px 2px #000a",
    maxWidth: "100%",
  },
  duration: {
    position: "absolute",
    right: 12,
    bottom: 8,
    fontSize: 13,
    color: "#e0e0e0",
    background: "rgba(30,30,30,0.7)",
    borderRadius: 6,
    padding: "2px 8px",
    fontWeight: 500,
    boxShadow: "0 1px 2px #0004",
  },
  spinner: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: 22,
    height: 22,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  spinnerDot: {
    width: 16,
    height: 16,
    border: "3px solid #fff3",
    borderTop: "3px solid #e53935",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
};

// Add keyframes for spinner animation
document.head.insertAdjacentHTML(
  "beforeend",
  `<style>@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style>`
);
