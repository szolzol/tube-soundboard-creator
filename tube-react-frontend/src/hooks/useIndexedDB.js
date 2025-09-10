// Basic IndexedDB wrapper for Tube Soundboard
import { useCallback } from "react";

const DB_NAME = "soundboard-db";
const DB_VERSION = 4; // Match the version from thumbnailCache.js
const AUDIO_STORE = "audioFiles";
const LAYOUT_STORE = "layouts";
const SETTINGS_STORE = "settings";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      
      // Clean approach: recreate all stores for version consistency
      const existingStores = Array.from(db.objectStoreNames);
      existingStores.forEach(storeName => {
        try {
          db.deleteObjectStore(storeName);
        } catch (error) {
          console.warn('Could not delete store:', storeName, error);
        }
      });
      
      // Create all stores fresh
      db.createObjectStore(AUDIO_STORE, { keyPath: "id" });
      db.createObjectStore(LAYOUT_STORE, { keyPath: "id" });
      db.createObjectStore(SETTINGS_STORE, { keyPath: "key" });
      db.createObjectStore("thumbnails", { keyPath: "id" }); // Add thumbnail store
      
      console.log('IndexedDB schema updated to version', DB_VERSION);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => {
      console.warn('Database upgrade blocked - please close other tabs');
      reject(new Error('Database upgrade blocked'));
    };
  });
}

export function useIndexedDB() {
  // Generic get, put, delete, getAll
  const get = useCallback(async (store, key) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }, []);

  const put = useCallback(async (store, value) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      const req = tx.objectStore(store).put(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }, []);

  const del = useCallback(async (store, key) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      const req = tx.objectStore(store).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }, []);

  const getAll = useCallback(async (store) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }, []);

  return { get, put, del, getAll };
}
