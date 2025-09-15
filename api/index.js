const express = require("express");
const cors = require("cors");
const ytdl = require("@distube/ytdl-core");
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log("Headers:", req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("Body:", req.body);
  }
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "tube-soundboard-node-api",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Enhanced ytdl-core configuration for better bot detection avoidance
const ytdlOptions = {
  requestOptions: {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    }
  },
  // Additional options for bypassing restrictions
  lang: 'en',
  format: 'json',
};

// Retry function for handling temporary bot detection
async function getVideoInfoWithRetry(youtube_url, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} for ${youtube_url}`);
      
      // Add random delay between retries to avoid rate limiting
      if (attempt > 1) {
        const delay = Math.random() * 2000 + 1000; // 1-3 seconds
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const info = await ytdl.getInfo(youtube_url, ytdlOptions);
      return info;
    } catch (error) {
      console.log(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // If it's a bot detection error, try with different options
      if (error.message.includes('bot') || error.message.includes('Sign in')) {
        // Modify user agent for next attempt
        ytdlOptions.requestOptions.headers['User-Agent'] = 
          `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${90 + attempt}.0.${4000 + attempt * 100}.124 Safari/537.36`;
      }
    }
  }
}

// Video info endpoint (equivalent to Python /video-info)
app.post("/video-info", async (req, res) => {
  try {
    const { youtube_url } = req.body;

    if (!youtube_url) {
      return res.status(400).json({
        error: "youtube_url is required",
        received: req.body,
      });
    }

    console.log(`Getting video info for: ${youtube_url}`);

    // Get video info using ytdl-core with retry logic
    const info = await getVideoInfoWithRetry(youtube_url);

    // Get audio formats
    const audioFormats = ytdl.filterFormats(info.formats, "audioonly");
    const bestAudio = ytdl.chooseFormat(info.formats, {
      quality: "highestaudio",
      filter: "audioonly",
    });

    // Prepare response similar to Python version
    const response = {
      title: info.videoDetails.title,
      duration: parseInt(info.videoDetails.lengthSeconds),
      thumbnail: info.videoDetails.thumbnails?.[0]?.url || null,
      author: info.videoDetails.author?.name || "Unknown",
      view_count: parseInt(info.videoDetails.viewCount) || 0,
      upload_date: info.videoDetails.uploadDate || null,
      description: info.videoDetails.description?.substring(0, 500) || "",
      // Audio stream information
      audio_formats: audioFormats.map((format) => ({
        itag: format.itag,
        container: format.container,
        audio_codec: format.audioCodec,
        bitrate: format.audioBitrate,
        sample_rate: format.audioSampleRate,
        url: format.url, // Direct stream URL
      })),
      best_audio: bestAudio
        ? {
            itag: bestAudio.itag,
            container: bestAudio.container,
            audio_codec: bestAudio.audioCodec,
            bitrate: bestAudio.audioBitrate,
            url: bestAudio.url,
          }
        : null,
      extraction_method: "ytdl-core",
      success: true,
    };

    console.log(`Successfully extracted info for: ${response.title}`);
    res.json(response);
  } catch (error) {
    console.error("Error in /video-info:", error);
    res.status(500).json({
      error: error.message,
      extraction_method: "ytdl-core",
      success: false,
    });
  }
});

// Audio extraction endpoint (equivalent to Python /extract)
app.post("/extract", async (req, res) => {
  try {
    const { youtube_url, start_time, end_time, format = "mp3" } = req.body;

    if (!youtube_url) {
      return res.status(400).json({ error: "youtube_url is required" });
    }

    console.log(
      `Extracting audio: ${youtube_url} (${start_time}-${end_time}) -> ${format}`
    );

    // Get video info with retry logic
    const info = await getVideoInfoWithRetry(youtube_url);

    // Get best audio format
    const audioFormat = ytdl.chooseFormat(info.formats, {
      quality: "highestaudio",
      filter: "audioonly",
    });

    if (!audioFormat) {
      return res.status(404).json({
        error: "No audio stream found",
        success: false,
      });
    }

    // For now, return the direct stream URL and metadata
    // Client can handle time-based extraction using Web Audio API
    // or we can integrate ffmpeg.wasm later
    const response = {
      audio_url: audioFormat.url,
      container: audioFormat.container,
      bitrate: audioFormat.audioBitrate,
      codec: audioFormat.audioCodec,
      title: info.videoDetails.title,
      duration: parseInt(info.videoDetails.lengthSeconds),
      start_time: start_time,
      end_time: end_time,
      requested_format: format,
      extraction_method: "ytdl-core-direct",
      success: true,
      note: "Direct stream URL provided. Time-based extraction should be handled client-side or with additional processing.",
    };

    console.log(`Audio extraction successful for: ${response.title}`);
    res.json(response);
  } catch (error) {
    console.error("Error in /extract:", error);
    res.status(500).json({
      error: error.message,
      extraction_method: "ytdl-core",
      success: false,
    });
  }
});

// Batch processing endpoint (equivalent to Python /batch)
app.post("/batch", async (req, res) => {
  try {
    const { requests } = req.body;

    if (!Array.isArray(requests)) {
      return res.status(400).json({ error: "requests must be an array" });
    }

    console.log(`Processing batch of ${requests.length} requests`);

    const results = [];

    for (const request of requests) {
      try {
        const { youtube_url, start_time, end_time, format = "mp3" } = request;

        if (!youtube_url) {
          results.push({
            error: "youtube_url is required",
            success: false,
          });
          continue;
        }

        const info = await getVideoInfoWithRetry(youtube_url);
        const audioFormat = ytdl.chooseFormat(info.formats, {
          quality: "highestaudio",
          filter: "audioonly",
        });

        if (!audioFormat) {
          results.push({
            error: "No audio stream found",
            success: false,
          });
          continue;
        }

        results.push({
          audio_url: audioFormat.url,
          title: info.videoDetails.title,
          duration: parseInt(info.videoDetails.lengthSeconds),
          container: audioFormat.container,
          bitrate: audioFormat.audioBitrate,
          start_time,
          end_time,
          requested_format: format,
          success: true,
        });
      } catch (error) {
        console.error(`Batch item error:`, error);
        results.push({
          error: error.message,
          success: false,
        });
      }
    }

    console.log(
      `Batch processing complete: ${results.filter((r) => r.success).length}/${
        requests.length
      } successful`
    );
    res.json({
      results,
      total: requests.length,
      successful: results.filter((r) => r.success).length,
      extraction_method: "ytdl-core",
    });
  } catch (error) {
    console.error("Error in /batch:", error);
    res.status(500).json({
      error: error.message,
      extraction_method: "ytdl-core",
      success: false,
    });
  }
});

// Status endpoint
app.get("/status", (req, res) => {
  res.json({
    service: "tube-soundboard-node-api",
    status: "running",
    version: "1.0.0",
    extraction_method: "ytdl-core",
    features: [
      "video-info extraction",
      "direct audio stream URLs",
      "batch processing",
      "multiple audio formats",
    ],
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    error: "Internal server error",
    message: error.message,
    extraction_method: "ytdl-core",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    available_endpoints: [
      "GET /health",
      "GET /status",
      "POST /video-info",
      "POST /extract",
      "POST /batch",
    ],
  });
});

// Start server
// Export the app for Vercel serverless function
module.exports = app;

// For local development only
if (require.main === module) {
  app
    .listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Tube Soundboard Node.js API running on port ${PORT}`);
      console.log(`📡 Health check: http://localhost:${PORT}/health`);
      console.log(`🎵 Extraction method: ytdl-core`);
      console.log(`⏰ Started at: ${new Date().toISOString()}`);
      console.log(`🔗 Server bound to: 0.0.0.0:${PORT}`);
    })
    .on("error", (err) => {
      console.error("❌ Server error:", err);
      if (err.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is already in use`);
      }
    });
}
