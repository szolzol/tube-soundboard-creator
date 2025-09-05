import React, { useState, useEffect } from "react";
import ProgressBar from "./ProgressBar";
import MobileSoundboardGrid from "./MobileSoundboardGrid";
import { useAudioStorage } from "../hooks/useAudioStorage";
import { useStorageQuota } from "../hooks/useStorageQuota";

export default function AudioManager() {
  const { saveAudio, getAllAudio, deleteAudio, getAudio } = useAudioStorage();
  const { usage, quota, percent } = useStorageQuota();
  const [audioFiles, setAudioFiles] = useState([]);
  const [error, setError] = useState(null);

  // Új hang hozzáadása űrlap állapot
  const [ytUrl, setYtUrl] = useState("");
  // MM:SS string state for user input
  const [start, setStart] = useState("00:00");
  const [end, setEnd] = useState("00:00");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  // Progress bar state
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState("");

  useEffect(() => {
    getAllAudio().then(setAudioFiles).catch(setError);
  }, [getAllAudio]);

  // Playing state for grid
  const [playingId, setPlayingId] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const handlePlay = async (id) => {
    setPlayingId(id);
    const file = await getAudio(id);
    if (file && file.data) {
      let blob;
      // If data is already a Blob, use it. If it's base64, convert.
      if (file.data instanceof Blob) {
        blob = file.data;
      } else if (typeof file.data === "string") {
        // base64 to Blob
        const byteString = atob(file.data.split(",")[1] || file.data);
        const mime = "audio/mp3";
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++)
          ia[i] = byteString.charCodeAt(i);
        blob = new Blob([ab], { type: mime });
      }
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        setPlayingId(null);
        URL.revokeObjectURL(url);
      };
      audio.play();
    } else {
      setPlayingId(null);
    }
  };

  const handleDelete = async (id) => {
    setLoadingId(id);
    await deleteAudio(id);
    setAudioFiles(await getAllAudio());
    setLoadingId(null);
  };

  // YouTube hang hozzáadása
  const handleAdd = async (e) => {
    e.preventDefault();
    setError(null);
    // Validáció
    if (!ytUrl.trim()) {
      setError("Add meg a YouTube URL-t vagy ID-t!");
      return;
    }
    // MM:SS -> seconds conversion
    function parseTime(str) {
      if (!/^\d{1,2}:\d{2}$/.test(str)) return NaN;
      const [m, s] = str.split(":").map(Number);
      if (isNaN(m) || isNaN(s) || s > 59) return NaN;
      return m * 60 + s;
    }
    const startSec = parseTime(start);
    const endSec = parseTime(end);
    try {
      // 1. POST /extract
      const extractResp = await fetch("/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtube_url: ytUrl,
          start_time: startSec,
          end_time: endSec,
          output_format: "mp3",
        }),
      });
      if (!extractResp.ok) throw new Error("Hiba az indításnál");
      const { job_id } = await extractResp.json();
      // 2. Poll /status/{job_id} with progress bar
      let status = "queued",
        file_id = null,
        pollCount = 0,
        prog = 0;
      setProgress(0);
      setProgressStatus("Feldolgozás indítása...");
      while (status !== "done" && pollCount < 60) {
        await new Promise((res) => setTimeout(res, 2000));
        const statResp = await fetch(`/status/${job_id}`);
        if (!statResp.ok) throw new Error("Hiba a státusz lekérdezésnél");
        const stat = await statResp.json();
        status = stat.status;
        file_id = stat.file_id;
        prog = stat.progress || 0;
        setProgress(prog);
        setProgressStatus(
          status === "processing"
            ? "Feldolgozás..."
            : status === "queued"
            ? "Várakozás..."
            : status
        );
        if (stat.error) throw new Error(stat.error);
        pollCount++;
      }
      setProgress(100);
      setProgressStatus("Kész!");
      if (status !== "done" || !file_id)
        throw new Error("Nem sikerült letölteni a hangot");
      // 3. GET /download/{file_id}
      const dlResp = await fetch(`/download/${file_id}`);
      if (!dlResp.ok) throw new Error("Hiba a letöltésnél");
      const blob = await dlResp.blob();
      const id = `${ytUrl}_${start}_${end}`;
      await saveAudio(id, blob, { title, ytUrl, start, end }, blob.size);
      setAudioFiles(await getAllAudio());
      setYtUrl("");
      setStart("00:00");
      setEnd("00:00");
      setTitle("");
      setTimeout(() => {
        setProgress(0);
        setProgressStatus("");
      }, 1200);
    } catch (err) {
      setError(err.message);
      setProgress(0);
      setProgressStatus("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.manager}>
      {progress > 0 && (
        <ProgressBar progress={progress} status={progressStatus} />
      )}
      <form onSubmit={handleAdd} style={styles.form}>
        <input
          type="text"
          placeholder="YouTube URL vagy ID"
          value={ytUrl}
          onChange={(e) => setYtUrl(e.target.value)}
          required
          style={styles.input}
        />
        <div style={styles.rowInputs}>
          <input
            type="text"
            pattern="^\d{1,2}:\d{2}$"
            placeholder="Kezdő (MM:SS)"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
            style={{ ...styles.input, width: 90 }}
          />
          <input
            type="text"
            pattern="^\d{1,2}:\d{2}$"
            placeholder="Vége (MM:SS)"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            required
            style={{ ...styles.input, width: 90 }}
          />
        </div>
        <input
          type="text"
          placeholder="Cím"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={styles.input}
        />
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Download..." : "Add to Soundboard"}
        </button>
      </form>

      {error && <div style={styles.error}>Error: {String(error)}</div>}
      <div style={styles.gridWrap}>
        <MobileSoundboardGrid
          sounds={audioFiles.map((f) => ({
            id: f.id,
            title: f.metadata?.title || f.id,
            duration: f.metadata?.duration || null,
            isPlaying: playingId === f.id,
            isLoading: loadingId === f.id,
          }))}
          onPlay={handlePlay}
          onDelete={handleDelete}
        />
      </div>
      <div style={styles.quota}>
        <span style={styles.quotaLabel}>Quota:</span>
        <span style={styles.quotaValue}>
          {Math.round(usage / 1024 / 1024)} / {Math.round(quota / 1024 / 1024)}{" "}
          MB
        </span>
        <span style={styles.quotaPercent}>({percent}%)</span>
      </div>
    </div>
  );
}

const styles = {
  manager: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 32,
  },
  heading: {
    color: "#fff",
    fontSize: 28,
    fontWeight: 700,
    margin: "0 0 18px 0",
    textAlign: "center",
    letterSpacing: "1px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    width: "100%",
    maxWidth: 400,
    margin: "0 12px 18px 12px",
    borderRadius: 12,
    padding: "18px 16px",
    boxShadow: "none",
    transition: "background 0.2s, box-shadow 0.2s",
    background: "none",
  },
  input: {
    padding: "10px 14px",
    borderRadius: 7,
    border: "none",
    fontSize: 17,
    background: "var(--sb-input-bg, #333)",
    // ...existing code...
    boxShadow: "0 1px 6px #0002",
    outline: "none",
    marginBottom: 0,
    transition: "background 0.2s, color 0.2s",
    color: "var(--sb-input-color, #fff)",
  },
  rowInputs: {
    display: "flex",
    gap: 10,
    marginBottom: 0,
  },
  button: {
    padding: "12px 0",
    borderRadius: 7,
    border: "none",
    fontWeight: 700,
    fontSize: 18,
    background: "linear-gradient(90deg,#e53935,#e35d5b)",
    color: "#fff",
    boxShadow: "0 2px 8px #e5393533",
    cursor: "pointer",
    transition: "background 0.2s",
    marginTop: 8,
    letterSpacing: "1px",
  },
  quota: {
    margin: "10px 0 0 0",
    fontSize: 16,
    color: "var(--sb-quota-label, #e53935)",
    textAlign: "center",
    display: "flex",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  quotaLabel: {
    fontWeight: 500,
    color: "var(--sb-quota-label, #e53935)",
  },
  quotaValue: {
    fontWeight: 700,
    color: "var(--sb-quota-value, #fff)",
  },
  quotaPercent: {
    fontWeight: 400,
    color: "var(--sb-quota-percent, #e53935)",
  },
  error: {
    color: "var(--sb-error, #e53935)",
    fontWeight: 600,
    margin: "10px 0",
    textAlign: "center",
  },
  gridWrap: {
    width: "100%",
    marginTop: 24,
  },
};
