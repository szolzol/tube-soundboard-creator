import React, { useEffect, useState, useCallback } from "react";
import "./App.css";
import SoundboardGrid from "./components/SoundboardGrid";
import AddSoundForm from "./components/AddSoundForm";
import OfflineIndicator from "./components/OfflineIndicator";
import InstallPrompt from "./components/InstallPrompt";
import { useAudioStorage } from "./hooks/useAudioStorage";
import { useStorageQuota } from "./hooks/useStorageQuota";
import { usePWA } from "./hooks/usePWA";

function App() {
  const { saveAudio, getAllAudio, deleteAudio, getAudio } = useAudioStorage();
  const { usage, quota, percent } = useStorageQuota();
  const { deferredPrompt, promptInstall, isInstalled } = usePWA();
  
  const [sounds, setSounds] = useState([]);
  const [playingIds, setPlayingIds] = useState(new Set());
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeAudios, setActiveAudios] = useState(new Map());

  // Apply theme to body element
  useEffect(() => {
    document.body.className = isDarkMode ? 'dark-theme' : 'light-theme';
  }, [isDarkMode]);

  const loadSounds = useCallback(async () => {
    try {
      const audioFiles = await getAllAudio();
      setSounds(audioFiles);
    } catch (error) {
      console.error("Failed to load sounds:", error);
      setError("Failed to load sounds");
    }
  }, [getAllAudio]);

  // Load sounds on mount
  useEffect(() => {
    loadSounds();
  }, [loadSounds]);

  const handlePlay = async (id) => {
    // If clicking a button that's already playing, stop it
    if (playingIds.has(id)) {
      const audio = activeAudios.get(id);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      
      const newPlayingIds = new Set(playingIds);
      newPlayingIds.delete(id);
      setPlayingIds(newPlayingIds);
      
      const newActiveAudios = new Map(activeAudios);
      newActiveAudios.delete(id);
      setActiveAudios(newActiveAudios);
      return;
    }

    // Add to playing sounds
    const newPlayingIds = new Set(playingIds);
    newPlayingIds.add(id);
    setPlayingIds(newPlayingIds);

    try {
      const file = await getAudio(id);
      if (file && file.data) {
        let blob;
        if (file.data instanceof Blob) {
          blob = file.data;
        } else if (typeof file.data === "string") {
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
          setPlayingIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
          });
          setActiveAudios(prev => {
            const newMap = new Map(prev);
            newMap.delete(id);
            return newMap;
          });
          URL.revokeObjectURL(url);
        };
        
        audio.onpause = () => {
          if (audio.currentTime === 0) {
            setPlayingIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
            });
            setActiveAudios(prev => {
              const newMap = new Map(prev);
              newMap.delete(id);
              return newMap;
            });
            URL.revokeObjectURL(url);
          }
        };
        
        setActiveAudios(prev => new Map(prev).set(id, audio));
        audio.play();
      }
    } catch (error) {
      console.error("Failed to play sound:", error);
      setError("Failed to play sound");
      setPlayingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleDelete = async (id) => {
    setLoadingId(id);
    try {
      await deleteAudio(id);
      await loadSounds();
    } catch (error) {
      console.error("Failed to delete sound:", error);
      setError("Failed to delete sound");
    } finally {
      setLoadingId(null);
    }
  };

  const handleAddSound = async (soundData) => {
    try {
      setError(null);
      const { blob, metadata } = soundData;
      const id = `${metadata.ytUrl}_${metadata.start}_${metadata.end}`;
      await saveAudio(id, blob, metadata, blob.size);
      await loadSounds();
    } catch (err) {
      setError("Failed to add sound");
      throw err;
    }
  };

  const handleReorderSounds = (newOrder) => {
    // Map the reordered display objects back to original sound objects
    const reorderedSounds = newOrder.map(displaySound => {
      return sounds.find(originalSound => originalSound.id === displaySound.id);
    }).filter(Boolean);
    setSounds(reorderedSounds);
  };

  const handleRenameSound = async (id, newTitle) => {
    try {
      // Update the sound metadata in IndexedDB
      const soundIndex = sounds.findIndex(sound => sound.id === id);
      if (soundIndex !== -1) {
        const updatedSounds = [...sounds];
        updatedSounds[soundIndex] = {
          ...updatedSounds[soundIndex],
          metadata: {
            ...updatedSounds[soundIndex].metadata,
            title: newTitle
          }
        };
        
        // Save updated metadata back to IndexedDB
        const sound = updatedSounds[soundIndex];
        await saveAudio(sound.id, sound.data, sound.metadata, sound.size);
        
        // Update local state
        setSounds(updatedSounds);
      }
    } catch (error) {
      console.error("Failed to rename sound:", error);
      setError("Failed to rename sound");
    }
  };

  return (
    <div className={`app ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
      <header className="app-header">
        <div className="app-header-content">
          <h1 className="app-title">YouTube Soundboard</h1>
          <div className="app-status">
            <button 
              className="theme-toggle"
              onClick={() => setIsDarkMode(!isDarkMode)}
              aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <OfflineIndicator />
            <InstallPrompt
              deferredPrompt={deferredPrompt}
              promptInstall={promptInstall}
              isInstalled={isInstalled}
            />
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="app-container">
          <AddSoundForm onAddSound={handleAddSound} />
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <SoundboardGrid
            sounds={sounds.map((sound) => ({
              id: sound.id,
              title: sound.metadata?.title || sound.id,
              duration: sound.metadata?.duration || null,
              isPlaying: playingIds.has(sound.id),
              isLoading: loadingId === sound.id,
              thumbnailUrl: sound.metadata?.thumbnailUrl || sound.metadata?.screenshotUrl || null,
            }))}
            onPlay={handlePlay}
            onDelete={handleDelete}
            onReorder={handleReorderSounds}
            onRename={handleRenameSound}
          />

          <div className="storage-info">
            <span className="storage-label">Storage:</span>
            <span className="storage-usage">
              {Math.round(usage / 1024 / 1024)}MB / {Math.round(quota / 1024 / 1024)}MB
            </span>
            <span className="storage-percent">({percent}%)</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
