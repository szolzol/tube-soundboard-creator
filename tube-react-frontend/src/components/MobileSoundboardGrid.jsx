import React from "react";

/**
 * MobileSoundboardGrid
 * Responsive, dark-themed soundboard grid for mobile/tablet.
 * Props:
 *   sounds: Array<{ id, title, duration, isPlaying, isLoading }>
 *   onPlay: (id) => void
 *   onDelete?: (id) => void (optional)
 */
export default function MobileSoundboardGrid({ sounds, onPlay, onDelete }) {
  return (
  <div style={styles.grid}>
      {sounds.map((sound) => (
        <div key={sound.id} style={{ position: "relative" }}>
          <button
            style={{
              ...styles.button,
              ...(sound.isPlaying ? styles.playing : {}),
              ...(sound.isLoading ? styles.loading : {}),
            }}
            onClick={() => onPlay(sound.id)}
            disabled={sound.isLoading}>
            <div style={styles.title} title={sound.title}>
              {truncate(sound.title, 32)}
            </div>
            <div style={styles.duration}>{formatDuration(sound.duration)}</div>
            {sound.isLoading && <Spinner />}
          </button>
          {onDelete && (
            <button
              style={styles.deleteBtn}
              title="Törlés"
              onClick={() => onDelete(sound.id)}
              disabled={sound.isLoading}>
              <span style={{ fontWeight: 700, fontSize: 18 }}>&times;</span>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

function formatDuration(sec) {
  if (typeof sec !== "number" || isNaN(sec)) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 14,
    padding: "0 0 32px 0",
    background: "#181818",
    minHeight: 220,
    fontFamily: 'Montserrat, Arial, sans-serif',
    width: "100%",
    margin: "0 auto",
    borderRadius: 0,
    boxShadow: "none",
    position: "relative",
    zIndex: 1,
  },
  button: {
    background: "linear-gradient(180deg, #232323 80%, #181818 100%)",
    color: "#fff",
    border: "2px solid #222",
    borderRadius: 16,
    minHeight: 72,
    fontSize: 20,
    fontWeight: 700,
    padding: "22px 16px 16px 16px",
    textAlign: "center",
    position: "relative",
    boxShadow: "0 2px 16px #000c, 0 0 8px #e5393555 inset",
    transition: "background 0.2s, border 0.2s, color 0.2s, box-shadow 0.2s",
    outline: "none",
    cursor: "pointer",
    overflow: "hidden",
    userSelect: "none",
    letterSpacing: "1px",
    margin: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    background: "#2c2c2c",
    color: "#fff",
    border: "none",
    borderRadius: "50%",
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    opacity: 0.8,
    boxShadow: "0 1px 4px #0008",
    transition: "background 0.2s, opacity 0.2s",
    zIndex: 2,
  },
  playing: {
    border: "2px solid #e53935",
    background: "linear-gradient(180deg, #3a1818 80%, #2a1818 100%)",
    color: "#ffeaea",
    boxShadow: "0 0 16px #e53935cc, 0 2px 16px #000c",
    textShadow: "0 0 4px #e53935, 0 1px 2px #000a",
  },
  loading: {
    opacity: 0.6,
    pointerEvents: "none",
  },
  title: {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    marginBottom: 10,
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: "1px",
    textShadow: "0 2px 8px #000c, 0 0 2px #e5393555",
    width: "100%",
    textAlign: "center",
  },
  duration: {
    position: "absolute",
    right: 16,
    bottom: 12,
    fontSize: 15,
    color: "#fff",
    background: "#e53935cc",
    borderRadius: 8,
    padding: "2px 10px",
    fontWeight: 700,
    boxShadow: "0 2px 8px #e5393555, 0 1px 2px #0008",
    border: "2px solid #fff2",
    textShadow: "0 1px 2px #000a",
  },
  spinner: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: 26,
    height: 26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  spinnerDot: {
    width: 18,
    height: 18,
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
