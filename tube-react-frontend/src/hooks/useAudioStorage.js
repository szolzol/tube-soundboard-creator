// Audio file management with quota and cleanup
import { useCallback } from "react";
import { useIndexedDB } from "./useIndexedDB";

const AUDIO_STORE = "audioFiles";
const QUOTA_LIMIT = 50 * 1024 * 1024; // 50MB

export function useAudioStorage() {
  const { get, put, del, getAll } = useIndexedDB();

  // Save audio file (Base64 or Blob)
  const saveAudio = useCallback(
    async (id, data, metadata, size) => {
      const now = Date.now();
      const file = { id, data, metadata, size, createdAt: now };
      // Check quota before saving
      const usage = await getStorageUsage();
      if (usage + size > QUOTA_LIMIT) {
        await cleanupOldFiles(size + usage - QUOTA_LIMIT);
      }
      await put(AUDIO_STORE, file);
      return id;
    },
    [put]
  );

  // Get audio file by id
  const getAudio = useCallback(
    async (id) => {
      return await get(AUDIO_STORE, id);
    },
    [get]
  );

  // Delete audio file
  const deleteAudio = useCallback(
    async (id) => {
      await del(AUDIO_STORE, id);
    },
    [del]
  );

  // Get all audio files
  const getAllAudio = useCallback(async () => {
    return await getAll(AUDIO_STORE);
  }, [getAll]);

  // Get total storage usage
  const getStorageUsage = useCallback(async () => {
    const files = await getAll(AUDIO_STORE);
    return files.reduce((sum, f) => sum + (f.size || 0), 0);
  }, [getAll]);

  // Cleanup old files to free up at least 'needed' bytes
  const cleanupOldFiles = useCallback(
    async (needed = 0) => {
      const files = await getAll(AUDIO_STORE);
      files.sort((a, b) => a.createdAt - b.createdAt); // Oldest first
      let freed = 0;
      for (const f of files) {
        if (freed >= needed) break;
        await del(AUDIO_STORE, f.id);
        freed += f.size || 0;
      }
      return freed;
    },
    [getAll, del]
  );

  return {
    saveAudio,
    getAudio,
    deleteAudio,
    getAllAudio,
    getStorageUsage,
    cleanupOldFiles,
  };
}
