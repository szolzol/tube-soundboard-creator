// Storage quota monitoring hook
import { useState, useEffect } from "react";
import { useAudioStorage } from "./useAudioStorage";

const QUOTA_LIMIT = 50 * 1024 * 1024; // 50MB

export function useStorageQuota() {
  const { getStorageUsage } = useAudioStorage();
  const [usage, setUsage] = useState(0);
  const [quota, setQuota] = useState(QUOTA_LIMIT);

  useEffect(() => {
    let mounted = true;
    async function update() {
      const used = await getStorageUsage();
      if (mounted) setUsage(used);
    }
    update();
    const interval = setInterval(update, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [getStorageUsage]);

  return { usage, quota, percent: Math.round((usage / quota) * 100) };
}
