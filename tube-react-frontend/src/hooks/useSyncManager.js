// Sync manager for offline/online state
import { useEffect, useCallback, useRef } from "react";
import { useIndexedDB } from "./useIndexedDB";

const LAYOUT_STORE = "layouts";

export function useSyncManager(syncToServer, syncFromServer) {
  const { getAll, put } = useIndexedDB();
  const syncing = useRef(false);

  // Sync local unsynced layouts to server when online
  const syncUp = useCallback(async () => {
    if (syncing.current) return;
    syncing.current = true;
    try {
      const layouts = await getAll(LAYOUT_STORE);
      const unsynced = layouts.filter((l) => !l.synced);
      for (const layout of unsynced) {
        await syncToServer(layout);
        layout.synced = true;
        await put(LAYOUT_STORE, layout);
      }
    } finally {
      syncing.current = false;
    }
  }, [getAll, put, syncToServer]);

  // Sync from server to local
  const syncDown = useCallback(async () => {
    if (syncing.current) return;
    syncing.current = true;
    try {
      const serverLayouts = await syncFromServer();
      for (const layout of serverLayouts) {
        await put(LAYOUT_STORE, { ...layout, synced: true });
      }
    } finally {
      syncing.current = false;
    }
  }, [put, syncFromServer]);

  useEffect(() => {
    function handleOnline() {
      syncUp();
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [syncUp]);

  return { syncUp, syncDown };
}
