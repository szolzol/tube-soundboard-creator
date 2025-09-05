// Inject global background style for body and root
function injectGlobalBg() {
  if (document.getElementById("sb-bg-style")) return;
  const style = document.createElement("style");
  style.id = "sb-bg-style";
  style.innerHTML = `
    body, #root { background: var(--sb-bg) !important; transition: background 0.2s; }
    .sb-title {
      color: var(--sb-title);
      text-shadow: var(--sb-title-shadow);
      font-size: 40px;
      font-weight: 800;
      margin: 0 0 32px 0;
      text-align: center;
      letter-spacing: 2px;
      line-height: 1.1;
      word-break: break-word;
      transition: color 0.2s, text-shadow 0.2s, font-size 0.2s;
    }
    .sb-theme-switch-btn {
      background: var(--sb-card);
      border: 2px solid var(--sb-btn-playing, #e53935);
      box-shadow: 0 2px 8px #e5393533;
      border-radius: 8px;
      padding: 4px 8px;
      color: var(--sb-btn-playing, #e53935);
      font-size: 22px;
      cursor: pointer;
      opacity: 1;
      transition: background 0.2s, color 0.2s, border 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    @media (max-width: 600px) {
      .sb-title { font-size: 28px; font-weight: 700; margin: 0 0 18px 0; }
      .sb-card {
        padding: 18px 8px !important;
        max-width: 98vw !important;
        border: none !important;
        box-shadow: 0 2px 16px #0004 !important;
        background: var(--sb-card);
      }
      .sb-app { padding: 18px 0 !important; }
      .sb-footer { padding: 16px 0 8px 0 !important; }
    }
  `;
  document.head.appendChild(style);
}

import React, { useEffect, useState } from "react";
import OfflineIndicator from "./components/OfflineIndicator";
import InstallPrompt from "./components/InstallPrompt";
import AudioManager from "./components/AudioManager";
import { usePWA } from "./hooks/usePWA";

const PALETTES = {
  // Only keep one dark and one light palette definition
  dark: {
    "--sb-soundboard-btn-bg": "#fff",
    "--sb-soundboard-btn-color": "#222",
    "--sb-bg": "#181818",
    "--sb-card": "#232323",
    "--sb-title": "#fff",
    "--sb-title-shadow": "0 2px 12px #000, 0 1px 4px #e53935",
    "--sb-btn-bg": "linear-gradient(180deg, #232323 80%, #2c2c2c 100%)",
    "--sb-btn-color": "#fff",
    "--sb-btn-border": "#333",
    "--sb-btn-playing": "#e53935",
    "--sb-btn-playing-bg": "linear-gradient(180deg, #2a1818 80%, #3a2222 100%)",
    "--sb-btn-playing-color": "#ffeaea",
    "--sb-btn-delete-bg": "#2c2c2c",
    "--sb-btn-delete-color": "#fff",
    "--sb-form-bg": "#232323",
    "--sb-form-shadow": "0 2px 12px #0002",
    "--sb-input-bg": "#333",
    "--sb-input-color": "#fff",
    "--sb-input-placeholder": "#888",
    "--sb-error": "#e53935",
    "--sb-accent": "#e53935",
    "--sb-quota-label": "#e53935",
    "--sb-quota-value": "#fff",
    "--sb-quota-percent": "#e53935",
    "--sb-grid-border": "#333",
    "--sb-grid-shadow": "0 2px 8px #0006",
  },
  light: {
    "--sb-soundboard-btn-bg": "#f7f7fa",
    "--sb-soundboard-btn-color": "#222",
    "--sb-bg": "#f4f6fb",
    "--sb-card": "#fff",
    "--sb-title": "#222",
    "--sb-title-shadow": "0 2px 8px #bbb, 0 1px 4px #e53935",
    "--sb-btn-bg": "linear-gradient(180deg, #fff 80%, #f4f6fb 100%)",
    "--sb-btn-color": "#222",
    "--sb-btn-border": "#d1d5db",
    "--sb-btn-playing": "#e53935",
    "--sb-btn-playing-bg": "linear-gradient(180deg, #ffeaea 80%, #fff 100%)",
    "--sb-btn-playing-color": "#b71c1c",
    "--sb-btn-delete-bg": "#f4f6fb",
    "--sb-btn-delete-color": "#e53935",
    "--sb-input-bg": "#f7f7fa",
    "--sb-input-color": "#222",
    "--sb-input-placeholder": "#888",
    "--sb-form-bg": "#fff",
    "--sb-form-shadow": "0 2px 12px #d1d5db55",
    "--sb-error": "#b71c1c",
    "--sb-accent": "#e53935",
    "--sb-quota-label": "#e53935",
    "--sb-quota-value": "#222",
    "--sb-quota-percent": "#e53935",
    "--sb-grid-border": "#e0e0e0",
    "--sb-grid-shadow": "0 2px 8px #d1d5db33",
  },
};

function applyPalette(palette) {
  const vars = PALETTES[palette];
  if (!vars) return;
  for (const k in vars) {
    document.documentElement.style.setProperty(k, vars[k]);
  }
}

function getSystemTheme() {
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  )
    return "dark";
  return "light";
}

function App() {
  useEffect(() => {
    injectGlobalBg();
  }, []);
  const { deferredPrompt, promptInstall, isInstalled } = usePWA();
  const [theme, setTheme] = useState("auto");

  useEffect(() => {
    let active = theme;
    if (theme === "auto") active = getSystemTheme();
    applyPalette(active);
  }, [theme]);

  return (
    <div
      className="sb-app"
      style={{ ...styles.app, background: "var(--sb-bg)" }}>
      <header className="sb-header" style={styles.header}>
        <div style={styles.themeSwitchRow}>
          <ThemeSwitch theme={theme} setTheme={setTheme} />
        </div>
      </header>
      <div style={styles.mainContent}>
        <OfflineIndicator />
        <InstallPrompt
          deferredPrompt={deferredPrompt}
          promptInstall={promptInstall}
          isInstalled={isInstalled}
        />
        <h1 className="sb-title">YouTube Soundboard</h1>
        <div
          className="sb-card"
          style={{ ...styles.card, background: "var(--sb-card)" }}>
          <AudioManager />
        </div>
        <footer className="sb-footer" style={styles.footer}></footer>
      </div>
    </div>
  );
}

function ThemeSwitch({ theme, setTheme }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
      }}>
      <button
        className="sb-theme-switch-btn"
        style={
          theme === "light"
            ? {
                borderColor: "var(--sb-btn-playing, #e53935)",
                color: "var(--sb-btn-playing, #e53935)",
              }
            : {}
        }
        onClick={() => setTheme("light")}
        aria-label="Világos mód">
        <svg
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
          <g stroke="currentColor" strokeWidth="2">
            <line x1="11" y1="2" x2="11" y2="5" />
            <line x1="11" y1="17" x2="11" y2="20" />
            <line x1="2" y1="11" x2="5" y2="11" />
            <line x1="17" y1="11" x2="20" y2="11" />
            <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
            <line x1="15.66" y1="15.66" x2="17.78" y2="17.78" />
            <line x1="4.22" y1="17.78" x2="6.34" y2="15.66" />
            <line x1="15.66" y1="6.34" x2="17.78" y2="4.22" />
          </g>
        </svg>
      </button>
      <button
        className="sb-theme-switch-btn"
        style={
          theme === "dark"
            ? {
                borderColor: "var(--sb-btn-playing, #e53935)",
                color: "var(--sb-btn-playing, #e53935)",
              }
            : {}
        }
        onClick={() => setTheme("dark")}
        aria-label="Sötét mód">
        <svg
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
          <path
            d="M11 3a8 8 0 0 0 8 8c0 4.418-3.582 8-8 8a8 8 0 0 1 0-16z"
            fill="currentColor"
          />
        </svg>
      </button>
      <button
        className="sb-theme-switch-btn"
        style={
          theme === "auto"
            ? {
                borderColor: "var(--sb-btn-playing, #e53935)",
                color: "var(--sb-btn-playing, #e53935)",
              }
            : {}
        }
        onClick={() => setTheme("auto")}
        aria-label="Automatikus">
        <svg
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
          xmlns="http://www.w3.org/2000/svg">
          <rect
            x="4"
            y="4"
            width="14"
            height="14"
            rx="3"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="11" cy="11" r="4" stroke="currentColor" strokeWidth="2" />
        </svg>
      </button>
    </div>
  );
}

const styles = {
  app: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Montserrat, Arial, sans-serif",
    padding: "32px 0",
    transition: "background 0.2s",
    width: "100vw",
    boxSizing: "border-box",
  },
  header: {
    width: "100vw",
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 100,
    background: "var(--sb-bg)",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    height: "56px",
    boxShadow: "0 2px 8px #0002",
    borderBottom: "1px solid var(--sb-grid-border, #333)",
  },
  themeSwitchRow: {
    display: "flex",
    flexDirection: "row",
    gap: 8,
    marginLeft: 18,
    marginTop: 0,
    alignItems: "center",
    height: "100%",
  },
  mainContent: {
    width: "100vw",
    maxWidth: "100vw",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: "72px", // header + gap
    padding: "0 12px",
    minHeight: "calc(100vh - 72px)",
    boxSizing: "border-box",
  },
  card: {
    borderRadius: 18,
    boxShadow: "0 4px 32px #000c",
    padding: "32px 24px",
    maxWidth: "100%",
    width: "100%",
    margin: "0 auto 24px auto",
    transition: "background 0.2s",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    boxSizing: "border-box",
  },
  footer: {
    width: "100vw",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "24px 0 12px 0",
    background: "none",
  },
};
export default App;
