import AudioManager from "./components/AudioManager";

import OfflineIndicator from "./components/OfflineIndicator";

import InstallPrompt from "./components/InstallPrompt";
import { usePWA } from "./hooks/usePWA";

function App() {
  // PWA install prompt state
  const { deferredPrompt, promptInstall, isInstalled } = usePWA();

  return (
    <div className="App">
      <OfflineIndicator />
      <InstallPrompt
        deferredPrompt={deferredPrompt}
        promptInstall={promptInstall}
        isInstalled={isInstalled}
      />
      <h1>YouTube Soundboard</h1>
      {/* LayoutManager removed as requested */}
      <AudioManager />
    </div>
  );
}

export default App;
