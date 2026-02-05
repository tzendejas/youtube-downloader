// COMPLETE YouTube Downloader Server with Smart Redirect
const express = require('express');
const path = require('path');
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

// === SMART ROOT ROUTE (Option C) ===
app.get('/', (req, res) => {
  const userAgent = req.headers['user-agent'] || '';
  const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(userAgent);
  
  if (isMobile) {
    // Mobile users go directly to phone downloader
    res.redirect('/phone-downloader.html');
  } else {
    // Desktop users see landing page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>YouTube Downloader</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0f0f0f, #1a1a1a);
            color: white;
            min-height: 100vh;
            padding: 20px;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            text-align: center;
          }
          .header {
            margin: 40px 0;
          }
          h1 {
            color: #FF0000;
            font-size: 42px;
            margin-bottom: 10px;
          }
          .subtitle {
            font-size: 18px;
            color: #ccc;
            margin-bottom: 30px;
          }
          .cards {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            justify-content: center;
            margin: 40px 0;
          }
          .card {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 15px;
            padding: 30px;
            width: 350px;
            transition: transform 0.3s;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          .card:hover {
            transform: translateY(-5px);
            border-color: #FF0000;
          }
          .card h2 {
            color: #00FF00;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
          }
          .card p {
            color: #aaa;
            line-height: 1.6;
            margin-bottom: 20px;
          }
          .btn {
            display: inline-block;
            background: linear-gradient(135deg, #FF0000, #CC0000);
            color: white;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 10px;
            font-weight: bold;
            font-size: 16px;
            transition: all 0.3s;
          }
          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(255, 0, 0, 0.3);
          }
          .status {
            margin-top: 40px;
            padding: 20px;
            background: rgba(0, 255, 0, 0.1);
            border-radius: 10px;
            border-left: 5px solid #00FF00;
          }
          .features {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin: 30px 0;
            flex-wrap: wrap;
          }
          .feature {
            text-align: center;
            padding: 15px;
          }
          .feature-icon {
            font-size: 30px;
            margin-bottom: 10px;
          }
          .footer {
            margin-top: 50px;
            color: #888;
            font-size: 14px;
          }
          @media (max-width: 600px) {
            .cards { flex-direction: column; }
            .card { width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎬 YouTube Downloader</h1>
            <div class="subtitle">Download videos on any device, anywhere</div>
          </div>
          
          <div class="features">
            <div class="feature">
              <div class="feature-icon">📱</div>
              <div>Mobile Ready</div>
            </div>
            <div class="feature">
              <div class="feature-icon">⚡</div>
              <div>Fast Downloads</div>
            </div>
            <div class="feature">
              <div class="feature-icon">🔒</div>
              <div>No Registration</div>
            </div>
            <div class="feature">
              <div class="feature-icon">🌐</div>
              <div>Works Everywhere</div>
            </div>
          </div>
          
          <div class="cards">
            <div class="card">
              <h2>📱 Mobile Users</h2>
              <p>Download videos directly to your phone. Works on iPhone, Android, and tablets.</p>
              <a href="/phone-downloader.html" class="btn">Go to Mobile Downloader →</a>
            </div>
            
            <div class="card">
              <h2>🖥️ Desktop Users</h2>
              <p>For best experience, install our browser extension for one-click downloads.</p>
              <a href="https://github.com/tzendejas/youtube-downloader" class="btn" target="_blank">Get Browser Extension →</a>
            </div>
          </div>
          
          <div class="status">
            <p>✅ <strong>Server Status:</strong> Online & Running</p>
            <p>🌐 <strong>Hosted on:</strong> Render.com Cloud</p>
            <p>🚀 <strong>Service:</strong> Using y2mate.is for reliable downloads</p>
          </div>
          
          <div class="footer">
            <p>Note: This service uses public download APIs. No videos are stored on our servers.</p>
            <p>© ${new Date().getFullYear()} YouTube Downloader | Cloud Hosted Version</p>
          </div>
        </div>
      </body>
      </html>
    `);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'YouTube Downloader Server',
    port: PORT,
    running_on: process.env.RENDER ? 'Render Cloud' : 'Local',
    time: new Date().toISOString(),
    features: ['mobile_downloader', 'quality_selection', 'cloud_hosted']
  });
});

// Test page
app.get('/test', (req, res) => {
  res.send(`
    <html>
      <body style="padding:30px;font-family:Arial;background:#0f0f0f;color:white">
        <h1 style="color:#FF0000">🧪 Test Page</h1>
        <p>Test the download functionality:</p>
        <input id="vid" value="dQw4w9WgXcQ" placeholder="Video ID" 
               style="padding:10px;width:250px;background:#222;color:white;border:1px solid #444">
        <button onclick="test()" 
                style="padding:10px 20px;background:#FF0000;color:white;border:none;border-radius:5px;margin-left:10px">
          Test Download
        </button>
        <div id="result" style="margin-top:20px;padding:15px;background:#222;border-radius:5px"></div>
        
        <script>
          async function test() {
            const videoId = document.getElementById('vid').value;
            const result = document.getElementById('result');
            result.innerHTML = '⏳ Testing...';
            
            if (!videoId || videoId.length !== 11) {
              result.innerHTML = '❌ Invalid video ID';
              return;
            }
            
            // Direct link to y2mate
            const y2mateUrl = 'https://y2mate.is/youtube/' + videoId;
            window.open(y2mateUrl, '_blank');
            result.innerHTML = '✅ Opening y2mate.is...';
          }
        </script>
        
        <div style="margin-top:30px">
          <a href="/" style="color:#00FF00">← Back to Home</a> | 
          <a href="/phone-downloader.html" style="color:#00FF00">Go to Mobile Downloader</a>
        </div>
      </body>
    </html>
  `);
});

// Download endpoint (simplified for cloud)
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
  
  // Use y2mate service (since yt-dlp not available on Render)
  const y2mateUrl = `https://y2mate.is/youtube/${videoId}`;
  
  res.json({
    success: true,
    message: 'Redirecting to download service',
    redirectUrl: y2mateUrl,
    fallback: y2mateUrl,
    videoId: videoId,
    quality: quality,
    service: 'y2mate.is',
    note: 'This cloud version uses y2mate.is for reliable downloads'
  });
});

// Start server
const HOST = process.env.RENDER ? '0.0.0.0' : '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`
  =========================================
  🎬 YOUTUBE DOWNLOADER SERVER
  📍 Port: ${PORT}
  🌐 Local: http://localhost:${PORT}
  ${process.env.RENDER ? '🌐 Cloud: Public URL from Render' : `🌐 Network: http://10.0.0.145:${PORT}`}
  =========================================
  ✅ Server ready!
  ✅ Smart redirect: Mobile → /phone-downloader.html
  ✅ Using: y2mate.is service
  ✅ Static files served from: ${__dirname}
  =========================================
  `);
  
  // Cloud message
  if (process.env.RENDER) {
    console.log('🚀 Running on Render.com Cloud');
    console.log('📱 Share this URL with anyone!');
  }
});