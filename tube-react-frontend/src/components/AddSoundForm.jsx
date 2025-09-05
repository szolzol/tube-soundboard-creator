import React, { useState } from "react";
import "./AddSoundForm.css";

function AddSoundForm({ onAddSound }) {
  const [ytUrl, setYtUrl] = useState("");
  const [start, setStart] = useState("00:00");
  const [end, setEnd] = useState("00:00");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState("");

  const parseTime = (str) => {
    if (!/^\d{1,2}:\d{2}$/.test(str)) return NaN;
    const [m, s] = str.split(":").map(Number);
    if (isNaN(m) || isNaN(s) || s > 59) return NaN;
    return m * 60 + s;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!ytUrl.trim()) {
      alert("Please enter a YouTube URL or ID");
      return;
    }

    const startSec = parseTime(start);
    const endSec = parseTime(end);
    
    if (isNaN(startSec) || isNaN(endSec)) {
      alert("Please enter valid time format (MM:SS)");
      return;
    }

    if (startSec >= endSec) {
      alert("End time must be after start time");
      return;
    }

    setLoading(true);
    setProgress(0);
    setProgressStatus("Starting extraction...");

    try {
      // 1. POST /extract
      const extractResp = await fetch("http://localhost:8000/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtube_url: ytUrl,
          start_time: startSec,
          end_time: endSec,
          output_format: "mp3",
        }),
      });

      if (!extractResp.ok) throw new Error("Failed to start extraction");
      const { job_id } = await extractResp.json();

      // 2. Poll /status/{job_id}
      let status = "queued";
      let file_id = null;
      let pollCount = 0;

      while (status !== "done" && pollCount < 60) {
        await new Promise((res) => setTimeout(res, 2000));
        const statResp = await fetch(`http://localhost:8000/status/${job_id}`);
        if (!statResp.ok) throw new Error("Failed to check status");
        
        const stat = await statResp.json();
        status = stat.status;
        file_id = stat.file_id;
        const prog = stat.progress || 0;
        
        setProgress(prog);
        setProgressStatus(
          status === "processing" ? "Processing audio..." :
          status === "queued" ? "Waiting in queue..." : status
        );
        
        if (stat.error) throw new Error(stat.error);
        pollCount++;
      }

      if (status !== "done" || !file_id) {
        throw new Error("Extraction timed out or failed");
      }

      setProgress(100);
      setProgressStatus("Downloading...");

      // 3. GET /download/{file_id}
      const dlResp = await fetch(`http://localhost:8000/download/${file_id}`);
      if (!dlResp.ok) throw new Error("Failed to download file");
      
      const blob = await dlResp.blob();
      
      // Get thumbnail URL if available
      const thumbnailUrl = `http://localhost:8000/thumbnail/${file_id}`;
      
      // Call parent handler
      await onAddSound({
        blob,
        metadata: { 
          title, 
          ytUrl, 
          start, 
          end,
          thumbnailUrl: thumbnailUrl
        }
      });

      // Reset form
      setYtUrl("");
      setStart("00:00");
      setEnd("00:00");
      setTitle("");
      setProgressStatus("Complete!");
      
      setTimeout(() => {
        setProgress(0);
        setProgressStatus("");
      }, 1500);

    } catch (error) {
      alert(`Error: ${error.message}`);
      setProgress(0);
      setProgressStatus("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-sound-form">
      <h2 className="form-title">Add New Sound</h2>
      
      {progress > 0 && (
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="progress-status">{progressStatus}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form">
        <div className="form-group">
          <label htmlFor="ytUrl" className="form-label">
            YouTube URL or ID
          </label>
          <input
            id="ytUrl"
            type="text"
            className="form-input"
            placeholder="https://youtube.com/watch?v=... or video ID"
            value={ytUrl}
            onChange={(e) => setYtUrl(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="start" className="form-label">
              Start Time
            </label>
            <input
              id="start"
              type="text"
              className="form-input"
              placeholder="MM:SS"
              pattern="^\d{1,2}:\d{2}$"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="end" className="form-label">
              End Time
            </label>
            <input
              id="end"
              type="text"
              className="form-input"
              placeholder="MM:SS"
              pattern="^\d{1,2}:\d{2}$"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="title" className="form-label">
            Title (optional)
          </label>
          <input
            id="title"
            type="text"
            className="form-input"
            placeholder="Custom title for this sound"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
          />
        </div>

        <button 
          type="submit" 
          className="submit-button"
          disabled={loading}
        >
          {loading ? "Processing..." : "Add Sound"}
        </button>
      </form>
    </div>
  );
}

export default AddSoundForm;
