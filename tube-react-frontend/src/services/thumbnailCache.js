// Thumbnail cache service for storing thumbnails locally

const DB_NAME = "soundboard-db";
const DB_VERSION = 4; // Increment to avoid version conflicts with previous deployments
const THUMBNAIL_STORE = 'thumbnails';

// Direct IndexedDB operations (without React hooks)
const openDB = () => {
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
      db.createObjectStore('audioFiles', { keyPath: "id" });
      db.createObjectStore('layouts', { keyPath: "id" });
      db.createObjectStore('settings', { keyPath: "key" });
      db.createObjectStore(THUMBNAIL_STORE, { keyPath: "id" });
      
      console.log('IndexedDB schema updated to version', DB_VERSION);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => {
      console.warn('Database upgrade blocked - please close other tabs');
      reject(new Error('Database upgrade blocked'));
    };
  });
};

const dbGet = async (key) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(THUMBNAIL_STORE, "readonly");
    const req = tx.objectStore(THUMBNAIL_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

const dbPut = async (value) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(THUMBNAIL_STORE, "readwrite");
    const req = tx.objectStore(THUMBNAIL_STORE).put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

const dbDel = async (key) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(THUMBNAIL_STORE, "readwrite");
    const req = tx.objectStore(THUMBNAIL_STORE).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

const dbGetAll = async () => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(THUMBNAIL_STORE, "readonly");
    const req = tx.objectStore(THUMBNAIL_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

// Convert blob to base64 for storage
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Convert base64 back to blob URL
const base64ToBlobUrl = (base64) => {
  const byteString = atob(base64.split(',')[1]);
  const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mimeString });
  return URL.createObjectURL(blob);
};

export class ThumbnailCache {
  // Download and cache a thumbnail
  async cacheImage(url, key) {
    if (!url || !key) return null;
    
    try {
      // Check if already cached
      const cached = await this.getFromCache(key);
      if (cached) return cached;

      // Download the image
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
      
      const blob = await response.blob();
      const base64 = await blobToBase64(blob);
      
      // Store in cache
      const cacheEntry = {
        id: key,
        data: base64,
        createdAt: Date.now(),
        originalUrl: url
      };
      
      await dbPut(cacheEntry);
      
      // Return blob URL for immediate use
      return base64ToBlobUrl(base64);
    } catch (error) {
      console.warn('Failed to cache thumbnail:', error);
      return null;
    }
  }

  // Get cached thumbnail
  async getFromCache(key) {
    try {
      const cached = await dbGet(key);
      if (cached && cached.data) {
        return base64ToBlobUrl(cached.data);
      }
      return null;
    } catch (error) {
      console.warn('Failed to get cached thumbnail:', error);
      return null;
    }
  }

  // Preload and cache thumbnails for a file_id
  async preloadThumbnails(file_id, thumbnailUrl, screenshotUrl) {
    const results = {};
    
    if (thumbnailUrl) {
      const cached = await this.cacheImage(thumbnailUrl, `thumb_${file_id}`);
      if (cached) results.thumbnailUrl = cached;
    }
    
    if (screenshotUrl) {
      const cached = await this.cacheImage(screenshotUrl, `screenshot_${file_id}`);
      if (cached) results.screenshotUrl = cached;
    }
    
    return results;
  }

  // Clean up old thumbnails (keep only last 50)
  async cleanup() {
    try {
      const all = await dbGetAll();
      if (all.length > 50) {
        // Sort by creation date, oldest first
        all.sort((a, b) => a.createdAt - b.createdAt);
        const toDelete = all.slice(0, all.length - 50);
        
        for (const item of toDelete) {
          await dbDel(item.id);
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup thumbnails:', error);
    }
  }
}

// Create singleton instance
export const thumbnailCache = new ThumbnailCache();
