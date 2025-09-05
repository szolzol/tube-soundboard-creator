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

  // Helper function to parse time string to seconds
  const parseTimeToSeconds = (timeStr) => {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return minutes * 60 + seconds;
    }
    return 0;
  };

  // Helper function to format seconds to MM:SS
  const formatSecondsToTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Increment/decrement time functions
  const adjustTime = (timeStr, increment) => {
    const totalSeconds = parseTimeToSeconds(timeStr);
    const newSeconds = Math.max(0, totalSeconds + increment);
    return formatSecondsToTime(newSeconds);
  };

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

      if (!extractResp.ok) throw new Error("Failed to start extraction");
      const { job_id } = await extractResp.json();

      // 2. Poll /status/{job_id}
      let status = "queued";
      let file_id = null;
      let jobResult = null;
      let pollCount = 0;

      while (status !== "done" && pollCount < 60) {
        await new Promise((res) => setTimeout(res, 2000));
        const statResp = await fetch(`/status/${job_id}`);
        if (!statResp.ok) throw new Error("Failed to check status");

        const stat = await statResp.json();
        status = stat.status;
        file_id = stat.file_id;
        jobResult = stat.result;
        const prog = stat.progress || 0;

        setProgress(prog);
        setProgressStatus(
          status === "processing"
            ? "Processing audio..."
            : status === "queued"
            ? "Waiting in queue..."
            : status
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
      const dlResp = await fetch(`/download/${file_id}`);
      if (!dlResp.ok) throw new Error("Failed to download file");

      const blob = await dlResp.blob();

      // Get image URLs if available
      const thumbnailUrl = `/thumbnail/${file_id}`;
      const screenshotUrl = `/screenshot/${file_id}`;

      // Extract video title from job result
      const videoTitle = jobResult?.video_title || "Untitled";
      console.log("DEBUG: Job result:", jobResult);
      console.log("DEBUG: Video title extracted:", videoTitle);

      // Call parent handler
      await onAddSound({
        blob,
        metadata: {
          title: title.trim() || videoTitle, // Use custom title or fallback to video title
          ytUrl,
          start,
          end,
          thumbnailUrl: thumbnailUrl,
          screenshotUrl: screenshotUrl,
          file_id: file_id,
          video_title: videoTitle,
        },
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
      {progress > 0 && (
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
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
            <div className="time-input-container">
              <input
                id="start"
                type="text"
                className="form-input time-input"
                placeholder="MM:SS"
                pattern="^\d{1,2}:\d{2}$"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                required
                disabled={loading}
              />
              <div className="time-controls">
                <button
                  type="button"
                  className="time-btn time-btn-up"
                  onClick={() => setStart(adjustTime(start, 1))}
                  disabled={loading}
                  aria-label="Increase start time by 1 second"
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="time-btn time-btn-down"
                  onClick={() => setStart(adjustTime(start, -1))}
                  disabled={loading}
                  aria-label="Decrease start time by 1 second"
                >
                  ▼
                </button>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="end" className="form-label">
              End Time
            </label>
            <div className="time-input-container">
              <input
                id="end"
                type="text"
                className="form-input time-input"
                placeholder="MM:SS"
                pattern="^\d{1,2}:\d{2}$"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                required
                disabled={loading}
              />
              <div className="time-controls">
                <button
                  type="button"
                  className="time-btn time-btn-up"
                  onClick={() => setEnd(adjustTime(end, 1))}
                  disabled={loading}
                  aria-label="Increase end time by 1 second"
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="time-btn time-btn-down"
                  onClick={() => setEnd(adjustTime(end, -1))}
                  disabled={loading}
                  aria-label="Decrease end time by 1 second"
                >
                  ▼
                </button>
              </div>
            </div>
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

        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? "Processing..." : "Add Sound"}
        </button>
      </form>
    </div>
  );
}

export default AddSoundForm;
