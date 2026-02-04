// COMPLETE YouTube Downloader Server with Quality Selection
const express = require('express');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const app = express();

// Use Render's port or local 3001
const PORT = process.env.PORT || 3001;

// Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
app.use(express.json());

// Serve static files (for phone-downloader.html)
app.use(express.static(__dirname));

// Routes
app.get('/', (req, res) => {
  res.send(`
    <html>
      <body style="padding:40px;font-family:Arial;background:#0f0f0f;color:white">
        <h1 style="color:#FF0000">✅ YouTube Downloader Server</h1>
        <p>Server is running with yt-dlp</p>
        <p>Available pages:</p>
        <ul>
          <li><a href="/health" style="color:#00FF00">/health</a> - Health check</li>
          <li><a href="/phone-downloader.html" style="color:#00FF00">/phone-downloader.html</a> - Mobile downloader</li>
          <li><a href="/test" style="color:#00FF00">/test</a> - Test download</li>
        </ul>
        <p style="margin-top:30px;color:#888">Port: ${PORT} | Using: yt-dlp</p>
        <p>Running on: ${process.env.RENDER ? 'Render.com Cloud' : 'Local Computer'}</p>
      </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'YouTube Downloader Server',
    port: PORT,
    using: 'yt-dlp',
    running_on: process.env.RENDER ? 'Render Cloud' : 'Local',
    time: new Date().toLocaleTimeString()
  });
});

// Test page
app.get('/test', (req, res) => {
  res.send(`
    <html>
      <body style="padding:30px;font-family:Arial">
        <h1>Test YouTube Download</h1>
        <input id="vid" value="dQw4w9WgXcQ" placeholder="Video ID" style="padding:8px;width:200px">
        <select id="quality" style="padding:8px;margin-left:10px">
          <option value="best">Best</option>
          <option value="1080">1080p</option>
          <option value="720">720p</option>
          <option value="480">480p</option>
        </select>
        <button onclick="test()" style="padding:8px 16px;background:#FF0000;color:white;border:none;border-radius:4px;margin-left:10px">
          Test Download
        </button>
        <div id="result" style="margin-top:20px;padding:15px;background:#f0f0f0;border-radius:6px"></div>
        
        <script>
          async function test() {
            const videoId = document.getElementById('vid').value;
            const quality = document.getElementById('quality').value;
            const result = document.getElementById('result');
            result.innerHTML = '⏳ Testing...';
            
            try {
              const response = await fetch('/download', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({videoId: videoId, quality: quality})
              });
              
              const data = await response.json();
              if (data.success) {
                result.innerHTML = \`✅ Success! Quality: \${data.quality}<br>Downloading...\`;
                window.open(data.downloadUrl, '_blank');
              } else {
                result.innerHTML = \`❌ Error: \${data.error}\`;
              }
            } catch(e) {
              result.innerHTML = \`🔥 Exception: \${e.message}\`;
            }
          }
        </script>
      </body>
    </html>
  `);
});

// Download endpoint WITH QUALITY SELECTION
app.post('/download', async (req, res) => {
  const videoId = req.body.videoId;
  const quality = req.body.quality || 'best';
  
  console.log('📥 Download request:', { videoId, quality });
  
  // Validate video ID
  if (!videoId || videoId.length !== 11) {
    return res.json({ 
      success: false, 
      error: 'Invalid YouTube video ID (must be 11 characters)',
      fallback: `https://y2mate.is/youtube/${videoId || 'error'}`
    });
  }
  
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  try {
    // Determine format filter based on quality
    let formatFilter = "best[ext=mp4]";
    if (quality === '1080') formatFilter = "best[height<=1080][ext=mp4]";
    else if (quality === '720') formatFilter = "best[height<=720][ext=mp4]";
    else if (quality === '480') formatFilter = "best[height<=480][ext=mp4]";
    else if (quality === '360') formatFilter = "best[height<=360][ext=mp4]";
    // 'best' uses default filter
    
    console.log(`🎬 Processing: ${videoId} at quality: ${quality}`);
    console.log(`🔧 Using filter: ${formatFilter}`);
    
    // Use yt-dlp to get direct download URL
    const command = `yt-dlp -g -f "${formatFilter}" "${videoUrl}"`;
    console.log('Running command:', command);
    
    const { stdout, stderr } = await execPromise(command);
    
    // Check for errors
    if (stderr && stderr.includes('ERROR')) {
      console.error('yt-dlp error:', stderr);
      
      // Try alternative: just get best quality without mp4 restriction
      console.log('Trying alternative format...');
      const altCommand = `yt-dlp -g -f "best" "${videoUrl}"`;
      const { stdout: stdout2, stderr: stderr2 } = await execPromise(altCommand);
      
      if (stderr2 && stderr2.includes('ERROR')) {
        throw new Error(`yt-dlp failed: ${stderr2.substring(0, 100)}`);
      }
      
      var downloadUrl = stdout2.trim();
    } else {
      var downloadUrl = stdout.trim();
    }
    
    if (!downloadUrl) {
      throw new Error('No download URL found');
    }
    
    console.log(`✅ Got download URL (first 80 chars): ${downloadUrl.substring(0, 80)}...`);
    
    // Get video info
    let title = 'YouTube Video';
    let actualQuality = quality;
    let size = 'Unknown';
    
    try {
      // Get title
      const titleCommand = `yt-dlp --get-title "${videoUrl}"`;
      const { stdout: titleStdout } = await execPromise(titleCommand);
      title = titleStdout.trim().substring(0, 100);
      title = title.replace(/[<>:"/\\|?*]/g, '');
      
      // Get format info for actual quality
      const infoCommand = `yt-dlp -F "${videoUrl}"`;
      const { stdout: infoStdout } = await execPromise(infoCommand);
      const lines = infoStdout.split('\n');
      for (const line of lines) {
        if (line.includes(downloadUrl.substring(30, 50))) {
          const match = line.match(/(\d+p)/);
          if (match) actualQuality = match[1];
          const sizeMatch = line.match(/(\d+\.?\d*)(MiB|GiB)/);
          if (sizeMatch) size = sizeMatch[0];
          break;
        }
      }
    } catch (infoError) {
      console.log('Could not get full video info:', infoError.message);
    }
    
    res.json({
      success: true,
      downloadUrl: downloadUrl,
      title: title,
      videoId: videoId,
      quality: actualQuality,
      size: size,
      requestedQuality: quality,
      message: 'Ready to download!',
      fallback: `https://y2mate.is/youtube/${videoId}`
    });
    
  } catch (error) {
    console.error('🔥 Server error:', error.message);
    
    res.json({
      success: false,
      error: error.message,
      videoId: videoId,
      requestedQuality: quality,
      fallback: `https://y2mate.is/youtube/${videoId}`
    });
  }
});

// Start server
const HOST = process.env.RENDER ? '0.0.0.0' : '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`
  =========================================
  🎬 YOUTUBE DOWNLOADER SERVER
  📍 Port: ${PORT}
  🔧 Using: yt-dlp (Python)
  🌐 Local: http://localhost:${PORT}
  ${process.env.RENDER ? '🌐 Cloud: Public URL from Render' : `🌐 Network: http://10.0.0.145:${PORT}`}
  =========================================
  ✅ Server ready!
  ✅ Quality selection: best, 1080, 720, 480, 360
  ✅ Static files served from: ${__dirname}
  =========================================
  `);
  
  // Test yt-dlp installation
  exec('yt-dlp --version', (error, stdout) => {
    if (error) {
      console.log('⚠️  yt-dlp check failed:', error.message);
      console.log('💡 Make sure yt-dlp is installed: pip install yt-dlp');
    } else {
      console.log(`✅ yt-dlp version: ${stdout.trim()}`);
    }
  });
  
  // Cloud message
  if (process.env.RENDER) {
    console.log('🚀 Running on Render.com Cloud');
    console.log('📱 Share this URL with anyone: https://your-app-name.onrender.com');
  }
});