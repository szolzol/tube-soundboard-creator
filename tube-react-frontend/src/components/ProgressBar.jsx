import React from "react";

export default function ProgressBar({ progress = 0, status = "" }) {
  return (
    <div style={{ margin: "12px 0" }}>
      <div
        style={{
          background: "#eee",
          borderRadius: 6,
          height: 18,
          width: 300,
          overflow: "hidden",
          boxShadow: "0 1px 2px #0002",
        }}>
        <div
          style={{
            width: `${progress}%`,
            background: progress === 100 ? "#4caf50" : "#2196f3",
            height: "100%",
            transition: "width 0.3s",
          }}
        />
      </div>
      <div style={{ fontSize: 13, color: "#333", marginTop: 2 }}>
        {status} {progress}%
      </div>
    </div>
  );
}
