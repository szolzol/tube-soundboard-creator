// services/storageService.js
// IndexedDB-based local storage for audio files, layouts, and settings

const DB_NAME = "ytSoundboardDB";
const DB_VERSION = 1;
const SOUNDS_STORE = "sounds";
const LAYOUTS_STORE = "layouts";
const SETTINGS_STORE = "settings";
const STORAGE_LIMIT = 50 * 1024 * 1024; // 50MB

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(SOUNDS_STORE)) {
        db.createObjectStore(SOUNDS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(LAYOUTS_STORE)) {
        db.createObjectStore(LAYOUTS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveAudioFile(soundData, metadata) {
  const db = await openDB();
  const tx = db.transaction(SOUNDS_STORE, "readwrite");
  const store = tx.objectStore(SOUNDS_STORE);
  const id = metadata.id || crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const audioEntry = {
    id,
    title: metadata.title,
    audioData: soundData, // Blob or Base64
    metadata,
    createdAt,
  };
  try {
    await getStorageUsage(true, soundData);
    await store.put(audioEntry);
    await tx.complete;
    return id;
  } catch (e) {
    if (e.name === "QuotaExceededError" || e.message.includes("quota")) {
      throw new Error("Storage quota exceeded. Please delete old sounds.");
    }
    throw e;
  }
}

async function getAudioFile(soundId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SOUNDS_STORE, "readonly");
    const store = tx.objectStore(SOUNDS_STORE);
    const req = store.get(soundId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveSoundboardLayout(layout) {
  const db = await openDB();
  const tx = db.transaction(LAYOUTS_STORE, "readwrite");
  const store = tx.objectStore(LAYOUTS_STORE);
  await store.put(layout);
  await tx.complete;
}

async function getSoundboardLayouts() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LAYOUTS_STORE, "readonly");
    const store = tx.objectStore(LAYOUTS_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getStorageUsage(adding = false, newData = null) {
  // Estimate total size in bytes
  const db = await openDB();
  let total = 0;
  await Promise.all([
    new Promise((resolve) => {
      const tx = db.transaction(SOUNDS_STORE, "readonly");
      const store = tx.objectStore(SOUNDS_STORE);
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const entry = cursor.value;
          total += entry.audioData?.size || entry.audioData?.length || 0;
          cursor.continue();
        } else {
          resolve();
        }
      };
    }),
    new Promise((resolve) => {
      const tx = db.transaction(LAYOUTS_STORE, "readonly");
      const store = tx.objectStore(LAYOUTS_STORE);
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          total += JSON.stringify(cursor.value).length;
          cursor.continue();
        } else {
          resolve();
        }
      };
    }),
  ]);
  if (adding && newData) {
    total += newData.size || newData.length || 0;
    if (total > STORAGE_LIMIT) {
      throw new Error("QuotaExceededError");
    }
  }
  return total;
}

async function cleanupOldSounds() {
  const db = await openDB();
  const tx = db.transaction(SOUNDS_STORE, "readwrite");
  const store = tx.objectStore(SOUNDS_STORE);
  const req = store.openCursor();
  const now = Date.now();
  const maxAge = 1000 * 60 * 60 * 24 * 30; // 30 nap
  req.onsuccess = (e) => {
    const cursor = e.target.result;
    if (cursor) {
      const entry = cursor.value;
      if (now - new Date(entry.createdAt).getTime() > maxAge) {
        store.delete(entry.id);
      }
      cursor.continue();
    }
  };
  await tx.complete;
}

export {
  saveAudioFile,
  getAudioFile,
  saveSoundboardLayout,
  getSoundboardLayouts,
  getStorageUsage,
  cleanupOldSounds,
};
