import React from "react";

export default function OfflineIndicator({ offline }) {
  if (!offline) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#c00",
        color: "#fff",
        textAlign: "center",
        zIndex: 1000,
        padding: 8,
      }}>
      <b>Offline:</b> Az alkalmazás offline módban működik. Egyes funkciók nem
      elérhetők.
    </div>
  );
}
