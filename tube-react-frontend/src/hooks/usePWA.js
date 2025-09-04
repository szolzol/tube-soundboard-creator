import { useEffect, useState, useCallback } from "react";

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const beforeInstallHandler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", beforeInstallHandler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));
    window.addEventListener("online", () => setOffline(false));
    window.addEventListener("offline", () => setOffline(true));
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstallHandler);
      window.removeEventListener("appinstalled", () => setIsInstalled(true));
      window.removeEventListener("online", () => setOffline(false));
      window.removeEventListener("offline", () => setOffline(true));
    };
  }, []);

  const promptInstall = useCallback(() => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
    }
  }, [deferredPrompt]);

  return { deferredPrompt, promptInstall, isInstalled, offline };
}
