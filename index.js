const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', req.body);
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'tube-soundboard-api',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    extraction_method: 'ytdl-core'
  });
});

// Debug endpoint to check deployment version
app.get('/debug/version', (req, res) => {
  try {
    const { execSync } = require('child_process');
    let gitHash = 'unknown';
    
    try {
      gitHash = execSync('git rev-parse HEAD', { encoding: 'utf8', timeout: 5000 }).trim().substring(0, 8);
    } catch (gitError) {
      console.log('Git command failed:', gitError.message);
    }
    
    res.json({
      git_commit: gitHash,
      node_version: process.version,
      working_directory: process.cwd(),
      deployment_timestamp: new Date().toISOString(),
      extraction_method: 'ytdl-core',
      ytdl_version: require('@distube/ytdl-core/package.json').version
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      extraction_method: 'ytdl-core'
    });
  }
});

// Video info endpoint (equivalent to Python /video-info)
app.post('/video-info', async (req, res) => {
  try {
    const { youtube_url } = req.body;
    
    if (!youtube_url) {
      return res.status(400).json({ 
        error: 'youtube_url is required',
        received: req.body 
      });
    }

    console.log(`Getting video info for: ${youtube_url}`);
    
    // Get video info using ytdl-core
    const info = await ytdl.getInfo(youtube_url);
    
    // Get audio formats
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    const bestAudio = ytdl.chooseFormat(info.formats, { 
      quality: 'highestaudio',
      filter: 'audioonly' 
    });

    // Prepare response similar to Python version
    const response = {
      title: info.videoDetails.title,
      duration: parseInt(info.videoDetails.lengthSeconds),
      thumbnail: info.videoDetails.thumbnails?.[0]?.url || null,
      author: info.videoDetails.author?.name || 'Unknown',
      view_count: parseInt(info.videoDetails.viewCount) || 0,
      upload_date: info.videoDetails.uploadDate || null,
      description: info.videoDetails.description?.substring(0, 500) || '',
      // Audio stream information
      audio_formats: audioFormats.map(format => ({
        itag: format.itag,
        container: format.container,
        audio_codec: format.audioCodec,
        bitrate: format.audioBitrate,
        sample_rate: format.audioSampleRate,
        url: format.url // Direct stream URL
      })),
      best_audio: bestAudio ? {
        itag: bestAudio.itag,
        container: bestAudio.container,
        audio_codec: bestAudio.audioCodec,
        bitrate: bestAudio.audioBitrate,
        url: bestAudio.url
      } : null,
      extraction_method: 'ytdl-core',
      success: true
    };

    console.log(`Successfully extracted info for: ${response.title}`);
    res.json(response);

  } catch (error) {
    console.error('Error in /video-info:', error);
    res.status(500).json({ 
      error: error.message,
      extraction_method: 'ytdl-core',
      success: false 
    });
  }
});

// Audio extraction endpoint (equivalent to Python /extract)
app.post('/extract', async (req, res) => {
  try {
    const { youtube_url, start_time, end_time, format = 'mp3' } = req.body;
    
    if (!youtube_url) {
      return res.status(400).json({ error: 'youtube_url is required' });
    }

    console.log(`Extracting audio: ${youtube_url} (${start_time}-${end_time}) -> ${format}`);
    
    // Get video info
    const info = await ytdl.getInfo(youtube_url);
    
    // Get best audio format
    const audioFormat = ytdl.chooseFormat(info.formats, { 
      quality: 'highestaudio',
      filter: 'audioonly' 
    });

    if (!audioFormat) {
      return res.status(404).json({ 
        error: 'No audio stream found',
        success: false 
      });
    }

    // Return direct stream URL and metadata
    // Client can handle time-based extraction using Web Audio API
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
      extraction_method: 'ytdl-core-direct',
      success: true,
      note: 'Direct stream URL provided. Time-based extraction should be handled client-side or with additional processing.'
    };

    console.log(`Audio extraction successful for: ${response.title}`);
    res.json(response);

  } catch (error) {
    console.error('Error in /extract:', error);
    res.status(500).json({ 
      error: error.message,
      extraction_method: 'ytdl-core',
      success: false 
    });
  }
});

// Batch processing endpoint (equivalent to Python /batch)
app.post('/batch', async (req, res) => {
  try {
    const { requests } = req.body;
    
    if (!Array.isArray(requests)) {
      return res.status(400).json({ error: 'requests must be an array' });
    }

    console.log(`Processing batch of ${requests.length} requests`);
    
    const results = [];
    
    for (const request of requests) {
      try {
        const { youtube_url, start_time, end_time, format = 'mp3' } = request;
        
        if (!youtube_url) {
          results.push({ 
            error: 'youtube_url is required',
            success: false 
          });
          continue;
        }

        const info = await ytdl.getInfo(youtube_url);
        const audioFormat = ytdl.chooseFormat(info.formats, { 
          quality: 'highestaudio',
          filter: 'audioonly' 
        });

        if (!audioFormat) {
          results.push({ 
            error: 'No audio stream found',
            success: false 
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
          success: true
        });

      } catch (error) {
        console.error(`Batch item error:`, error);
        results.push({ 
          error: error.message,
          success: false 
        });
      }
    }

    console.log(`Batch processing complete: ${results.filter(r => r.success).length}/${requests.length} successful`);
    res.json({ 
      results,
      total: requests.length,
      successful: results.filter(r => r.success).length,
      extraction_method: 'ytdl-core'
    });

  } catch (error) {
    console.error('Error in /batch:', error);
    res.status(500).json({ 
      error: error.message,
      extraction_method: 'ytdl-core',
      success: false 
    });
  }
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    service: 'tube-soundboard-api',
    status: 'running',
    version: '1.0.0',
    extraction_method: 'ytdl-core',
    features: [
      'video-info extraction',
      'direct audio stream URLs',
      'batch processing',
      'multiple audio formats'
    ],
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint to test extract endpoint
app.get('/debug/test-extract', async (req, res) => {
  try {
    console.log('Testing extract endpoint...');
    
    // Test with a short clip from Rick Astley
    const testResult = await new Promise((resolve) => {
      const testReq = {
        body: {
          youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          start_time: "1",
          end_time: "3",
          format: "mp3"
        }
      };
      
      const testRes = {
        json: (data) => resolve(data),
        status: (code) => ({ json: (data) => resolve({ status_code: code, ...data }) })
      };
      
      // Simulate calling the extract endpoint
      app._router.stack.find(layer => 
        layer.route && layer.route.path === '/extract' && layer.route.methods.post
      ).route.stack[0].handle(testReq, testRes);
    });
    
    res.json({
      test_successful: testResult.success || false,
      result_type: typeof testResult,
      result_keys: Object.keys(testResult),
      extraction_method: testResult.extraction_method || 'unknown',
      has_audio_url: !!testResult.audio_url
    });
    
  } catch (error) {
    res.json({
      error: error.message,
      error_type: error.constructor.name,
      test_successful: false
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message,
    extraction_method: 'ytdl-core'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    available_endpoints: [
      'GET /health',
      'GET /status', 
      'GET /debug/version',
      'GET /debug/test-extract',
      'POST /video-info',
      'POST /extract',
      'POST /batch'
    ]
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Tube Soundboard Node.js API running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`🎵 Extraction method: ytdl-core`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    console.log(`🔗 Server bound to: 0.0.0.0:${PORT}`);
  }).on('error', (err) => {
    console.error('❌ Server error:', err);
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
    }
  });
}

module.exports = app;