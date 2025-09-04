import {
  saveAudioFile,
  getAudioFile,
  saveSoundboardLayout,
  getSoundboardLayouts,
  getStorageUsage,
  cleanupOldSounds,
} from "./storageService.js";

// Mock audio data (as Blob)
function createMockAudioBlob(size = 1024) {
  return new Blob([new Uint8Array(size)], { type: "audio/mp3" });
}

async function testStorageService() {
  try {
    // Save audio file
    const metadata = {
      id: "test1",
      title: "Test Sound",
      youtube_url: "https://youtu.be/test",
      timestamps: [0, 10],
    };
    const audioBlob = createMockAudioBlob(2048);
    const soundId = await saveAudioFile(audioBlob, metadata);
    console.log("✅ saveAudioFile passed:", soundId);

    // Get audio file
    const audio = await getAudioFile(soundId);
    if (audio && audio.title === "Test Sound") {
      console.log("✅ getAudioFile passed");
    } else {
      console.error("❌ getAudioFile failed");
    }

    // Save soundboard layout
    const layout = {
      id: "layout1",
      name: "Default",
      soundPositions: [soundId],
      theme: "dark",
    };
    await saveSoundboardLayout(layout);
    console.log("✅ saveSoundboardLayout passed");

    // Get soundboard layouts
    const layouts = await getSoundboardLayouts();
    if (layouts && layouts.length > 0) {
      console.log("✅ getSoundboardLayouts passed");
    } else {
      console.error("❌ getSoundboardLayouts failed");
    }

    // Get storage usage
    const usage = await getStorageUsage();
    console.log("✅ getStorageUsage:", usage, "bytes");

    // Cleanup old sounds (should not delete just created)
    await cleanupOldSounds();
    console.log("✅ cleanupOldSounds passed");
  } catch (e) {
    console.error("❌ StorageService test error:", e);
  }
}

testStorageService();
