import React from "react";

export default function InstallPrompt({
  deferredPrompt,
  promptInstall,
  isInstalled,
}) {
  if (isInstalled || !deferredPrompt) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        background: "#222",
        color: "#fff",
        textAlign: "center",
        zIndex: 1000,
        padding: 8,
      }}>
      <span>Telepítheted a Tube Soundboard alkalmazást! </span>
      <button
        onClick={promptInstall}
        style={{ marginLeft: 8, padding: "4px 12px" }}>
        Telepítés
      </button>
    </div>
  );
}
