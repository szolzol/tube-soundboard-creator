import React, { useState, useEffect } from "react";
import { useAudioStorage } from "../hooks/useAudioStorage";
import { useStorageQuota } from "../hooks/useStorageQuota";

export default function AudioManager() {
  const { saveAudio, getAllAudio, deleteAudio, getAudio } = useAudioStorage();
  const { usage, quota, percent } = useStorageQuota();
  const [audioFiles, setAudioFiles] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);

  // Új hang hozzáadása űrlap állapot
  const [ytUrl, setYtUrl] = useState("");
  // MM:SS string state for user input
  const [start, setStart] = useState("00:00");
  const [end, setEnd] = useState("00:00");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAllAudio().then(setAudioFiles).catch(setError);
  }, [getAllAudio]);

  const handlePlay = async (id) => {
    const file = await getAudio(id);
    if (file && file.data) {
      const audio = new Audio(file.data);
      audio.play();
    }
  };

  const handleDelete = async (id) => {
    await deleteAudio(id);
    setAudioFiles(await getAllAudio());
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
    if (isNaN(startSec) || startSec < 0) {
      setError("A kezdő időt MM:SS formátumban add meg (pl. 01:23)!");
      return;
    }
    if (isNaN(endSec) || endSec <= startSec) {
      setError(
        "A végidő nagyobb kell legyen, mint a kezdő idő, MM:SS formátumban!"
      );
      return;
    }
    setLoading(true);
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
      // 2. Poll /status/{job_id}
      let status = "queued",
        file_id = null,
        pollCount = 0;
      while (status !== "done" && pollCount < 60) {
        await new Promise((res) => setTimeout(res, 2000));
        const statResp = await fetch(`/status/${job_id}`);
        if (!statResp.ok) throw new Error("Hiba a státusz lekérdezésnél");
        const stat = await statResp.json();
        status = stat.status;
        file_id = stat.file_id;
        if (stat.error) throw new Error(stat.error);
        pollCount++;
      }
      if (status !== "done" || !file_id)
        throw new Error("Nem sikerült letölteni a hangot");
      // 3. GET /download/{file_id}
      const dlResp = await fetch(`/download/${file_id}`);
      if (!dlResp.ok) throw new Error("Hiba a letöltésnél");
      const blob = await dlResp.blob();
      const id = `${ytUrl}_${start}_${end}`;
      await saveAudio(
        id,
        URL.createObjectURL(blob),
        { title, ytUrl, start, end },
        blob.size
      );
      setAudioFiles(await getAllAudio());
      setYtUrl("");
      setStart("00:00");
      setEnd("00:00");
      setTitle("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Hangfájlok ({audioFiles.length})</h2>
      <form onSubmit={handleAdd} style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="YouTube URL vagy ID"
          value={ytUrl}
          onChange={(e) => setYtUrl(e.target.value)}
          required
          style={{ marginRight: 8 }}
        />
        <input
          type="text"
          pattern="^\d{1,2}:\d{2}$"
          placeholder="Kezdő (MM:SS)"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          required
          style={{ width: 90, marginRight: 8 }}
        />
        <input
          type="text"
          pattern="^\d{1,2}:\d{2}$"
          placeholder="Vége (MM:SS)"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          required
          style={{ width: 90, marginRight: 8 }}
        />
        <input
          type="text"
          placeholder="Cím"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Letöltés..." : "Hozzáadás"}
        </button>
      </form>
      <div>
        Használt tárhely: {Math.round(usage / 1024 / 1024)} /{" "}
        {Math.round(quota / 1024 / 1024)} MB ({percent}%)
      </div>
      {error && <div style={{ color: "red" }}>Hiba: {String(error)}</div>}
      <ul>
        {audioFiles.map((f) => (
          <li key={f.id}>
            <b>{f.metadata?.title || f.id}</b> (
            {Math.round((f.size || 0) / 1024)} KB)
            <button onClick={() => handlePlay(f.id)} style={{ marginLeft: 8 }}>
              Lejátszás
            </button>
            <button
              onClick={() => handleDelete(f.id)}
              style={{ marginLeft: 8 }}>
              Törlés
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
