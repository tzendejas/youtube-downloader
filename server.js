// COMPLETE Universal Video Downloader Server
const express = require('express');
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

// Serve static files
app.use(express.static(__dirname));

// === UNIVERSAL DOWNLOAD PAGE (Both Mobile & Desktop) ===
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Universal Video Downloader</title>
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
          max-width: 600px;
          margin: 0 auto;
          text-align: center;
        }
        .header {
          margin: 30px 0;
        }
        h1 {
          color: #FF0000;
          font-size: 36px;
          margin-bottom: 10px;
        }
        .subtitle {
          font-size: 16px;
          color: #ccc;
          margin-bottom: 20px;
        }
        .input-group {
          margin: 25px 0;
        }
        input {
          width: 100%;
          padding: 16px;
          font-size: 16px;
          border: 2px solid #333;
          border-radius: 10px;
          background: #1a1a1a;
          color: white;
          outline: none;
        }
        input:focus {
          border-color: #FF0000;
        }
        .site-selector {
          margin: 15px 0;
        }
        select {
          width: 100%;
          padding: 14px;
          font-size: 16px;
          border: 2px solid #333;
          border-radius: 10px;
          background: #1a1a1a;
          color: white;
          outline: none;
        }
        button {
          width: 100%;
          padding: 18px;
          background: linear-gradient(135deg, #FF0000, #CC0000);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          transition: 0.2s;
          margin: 10px 0;
        }
        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(255, 0, 0, 0.3);
        }
        .sites-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 15px;
          margin: 25px 0;
        }
        .site-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          padding: 15px;
          cursor: pointer;
          transition: all 0.3s;
          border: 1px solid transparent;
        }
        .site-card:hover, .site-card.active {
          border-color: #FF0000;
          background: rgba(255, 0, 0, 0.1);
        }
        .site-icon {
          font-size: 30px;
          margin-bottom: 8px;
        }
        .site-name {
          font-size: 14px;
          color: #ccc;
        }
        .result {
          margin-top: 20px;
          padding: 20px;
          border-radius: 10px;
          background: #1a1a1a;
          display: none;
          text-align: left;
        }
        .success {
          border-left: 5px solid #00FF00;
        }
        .error {
          border-left: 5px solid #FF0000;
        }
        .status {
          margin-top: 30px;
          padding: 15px;
          background: rgba(0, 255, 0, 0.1);
          border-radius: 10px;
          border-left: 5px solid #00FF00;
        }
        .footer {
          margin-top: 40px;
          color: #888;
          font-size: 14px;
        }
        .cloud-badge {
          background: linear-gradient(135deg, #00B4DB, #0083B0);
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          display: inline-block;
          margin-left: 10px;
        }
        .instructions {
          background: rgba(255, 255, 255, 0.05);
          padding: 15px;
          border-radius: 10px;
          margin: 20px 0;
          text-align: left;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎬 Universal Downloader <span class="cloud-badge">Cloud</span></h1>
          <div class="subtitle">Download videos from ANY site - 100% Free</div>
        </div>
        
        <div class="input-group">
          <input type="text" id="videoUrl" 
                 placeholder="Paste video link from ANY website..." 
                 autocomplete="off">
        </div>
        
        <div class="site-selector">
          <select id="siteType">
            <option value="auto">🌐 Auto-detect (Recommended)</option>
            <option value="youtube">🎬 YouTube</option>
            <option value="facebook">📘 Facebook</option>
            <option value="instagram">📸 Instagram</option>
            <option value="twitter">🐦 Twitter/X</option>
            <option value="tiktok">🎵 TikTok</option>
            <option value="zoom">📹 Zoom/Webex</option>
            <option value="vimeo">🎥 Vimeo</option>
            <option value="dailymotion">📺 Dailymotion</option>
            <option value="twitch">🟣 Twitch</option>
          </select>
        </div>
        
        <div class="sites-grid">
          <div class="site-card" data-site="youtube">
            <div class="site-icon">🎬</div>
            <div class="site-name">YouTube</div>
          </div>
          <div class="site-card" data-site="facebook">
            <div class="site-icon">📘</div>
            <div class="site-name">Facebook</div>
          </div>
          <div class="site-card" data-site="instagram">
            <div class="site-icon">📸</div>
            <div class="site-name">Instagram</div>
          </div>
          <div class="site-card" data-site="tiktok">
            <div class="site-icon">🎵</div>
            <div class="site-name">TikTok</div>
          </div>
          <div class="site-card" data-site="twitter">
            <div class="site-icon">🐦</div>
            <div class="site-name">Twitter/X</div>
          </div>
          <div class="site-card" data-site="zoom">
            <div class="site-icon">📹</div>
            <div class="site-name">Zoom</div>
          </div>
        </div>
        
        <button id="downloadBtn">⬇️ Download Video</button>
        
        <div class="instructions">
          <strong>📋 How to use:</strong><br>
          1. Copy video URL from ANY website<br>
          2. Paste above<br>
          3. Select site type (or auto-detect)<br>
          4. Click download<br>
          5. Follow instructions on download site
        </div>
        
        <div id="result" class="result"></div>
        
        <div class="status">
          ✅ <strong>Status:</strong> Online & Ready<br>
          🌐 <strong>Service:</strong> Using multiple download services<br>
          🚀 <strong>Hosted on:</strong> Render.com Cloud
        </div>
        
        <div class="footer">
          <p>Supports: YouTube, Facebook, Instagram, TikTok, Twitter/X, Zoom, Vimeo, Twitch, Dailymotion, and more</p>
          <p>Note: This service redirects to trusted download sites. No videos are stored on our servers.</p>
        </div>
      </div>

      <script>
        // === ELEMENTS ===
        const downloadBtn = document.getElementById('downloadBtn');
        const videoUrlInput = document.getElementById('videoUrl');
        const siteTypeSelect = document.getElementById('siteType');
        const resultDiv = document.getElementById('result');
        const siteCards = document.querySelectorAll('.site-card');
        
        // === SITE DETECTION ===
        function detectSite(url) {
          if (!url) return 'auto';
          
          if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
          if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
          if (url.includes('instagram.com')) return 'instagram';
          if (url.includes('tiktok.com')) return 'tiktok';
          if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
          if (url.includes('zoom.us') || url.includes('webex.com')) return 'zoom';
          if (url.includes('vimeo.com')) return 'vimeo';
          if (url.includes('twitch.tv')) return 'twitch';
          if (url.includes('dailymotion.com')) return 'dailymotion';
          
          return 'auto';
        }
        
        // === DOWNLOAD SERVICES ===
        const downloadServices = {
          youtube: (url) => `https://y2mate.is/youtube/${extractYouTubeId(url)}`,
          facebook: (url) => `https://fdown.net/?url=${encodeURIComponent(url)}`,
          instagram: (url) => `https://downloadgram.com/video-downloader.php?url=${encodeURIComponent(url)}`,
          tiktok: (url) => `https://snaptik.app/en?url=${encodeURIComponent(url)}`,
          twitter: (url) => `https://twdown.net/?url=${encodeURIComponent(url)}`,
          zoom: (url) => `https://zoom-video-downloader.com/?url=${encodeURIComponent(url)}`,
          vimeo: (url) => `https://vimeodownload.com/?url=${encodeURIComponent(url)}`,
          twitch: (url) => `https://twitchdownloader.com/?url=${encodeURIComponent(url)}`,
          dailymotion: (url) => `https://ddownr.com/?url=${encodeURIComponent(url)}`,
          auto: (url) => `https://en.savefrom.net/#url=${encodeURIComponent(url)}`
        };
        
        // Helper: Extract YouTube ID
        function extractYouTubeId(url) {
          const patterns = [
            /v=([a-zA-Z0-9_-]{11})/,
            /youtu\.be\/([a-zA-Z0-9_-]{11})/,
            /embed\/([a-zA-Z0-9_-]{11})/,
            /\/shorts\/([a-zA-Z0-9_-]{11})/
          ];
          
          for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
          }
          return url;
        }
        
        // === MAIN DOWNLOAD FUNCTION ===
        function downloadVideo() {
          const url = videoUrlInput.value.trim();
          let siteType = siteTypeSelect.value;
          
          if (!url) {
            showResult('Please paste a video URL first', 'error');
            videoUrlInput.focus();
            return;
          }
          
          // Auto-detect if set to auto
          if (siteType === 'auto') {
            siteType = detectSite(url);
            siteTypeSelect.value = siteType;
            updateActiveCard(siteType);
          }
          
          // Get download URL
          const service = downloadServices[siteType] || downloadServices.auto;
          const downloadUrl = service(url);
          
          // Show result and open download
          showResult(\`🔗 <strong>Opening download page...</strong><br>
                     <strong>Site:</strong> \${siteType}<br>
                     <strong>Service:</strong> \${getServiceName(siteType)}<br>
                     <small>Page will open in new tab. Follow instructions on the download site.</small>\`, 'success');
          
          // Open download page
          window.open(downloadUrl, '_blank');
          
          // Reset button after 3 seconds
          downloadBtn.disabled = true;
          downloadBtn.innerHTML = '✅ Opening...';
          setTimeout(() => {
            downloadBtn.disabled = false;
            downloadBtn.innerHTML = '⬇️ Download Video';
          }, 3000);
        }
        
        // Helper functions
        function showResult(message, type) {
          resultDiv.innerHTML = message;
          resultDiv.className = \`result \${type}\`;
          resultDiv.style.display = 'block';
          resultDiv.scrollIntoView({ behavior: 'smooth' });
        }
        
        function getServiceName(siteType) {
          const names = {
            youtube: 'y2mate.is',
            facebook: 'fdown.net',
            instagram: 'downloadgram.com',
            tiktok: 'snaptik.app',
            twitter: 'twdown.net',
            zoom: 'zoom-video-downloader.com',
            vimeo: 'vimeodownload.com',
            twitch: 'twitchdownloader.com',
            dailymotion: 'ddownr.com',
            auto: 'savefrom.net'
          };
          return names[siteType] || 'download service';
        }
        
        function updateActiveCard(siteType) {
          siteCards.forEach(card => {
            if (card.dataset.site === siteType) {
              card.classList.add('active');
            } else {
              card.classList.remove('active');
            }
          });
        }
        
        // === EVENT LISTENERS ===
        downloadBtn.addEventListener('click', downloadVideo);
        
        videoUrlInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') downloadVideo();
        });
        
        videoUrlInput.addEventListener('paste', (e) => {
          setTimeout(() => {
            const url = videoUrlInput.value;
            if (url) {
              const detected = detectSite(url);
              if (detected !== 'auto') {
                siteTypeSelect.value = detected;
                updateActiveCard(detected);
              }
            }
          }, 100);
        });
        
        // Site card clicks
        siteCards.forEach(card => {
          card.addEventListener('click', () => {
            const site = card.dataset.site;
            siteTypeSelect.value = site;
            updateActiveCard(site);
          });
        });
        
        // Auto-focus input
        videoUrlInput.focus();
      </script>
    </body>
    </html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Universal Video Downloader Server',
    port: PORT,
    running_on: process.env.RENDER ? 'Render Cloud' : 'Local',
    time: new Date().toISOString(),
    supported_sites: [
      'YouTube', 'Facebook', 'Instagram', 'TikTok', 'Twitter/X',
      'Zoom', 'Vimeo', 'Twitch', 'Dailymotion', 'Auto-detect'
    ]
  });
});

// Download API endpoint (for future extensions)
app.post('/api/download', (req, res) => {
  const { url, siteType = 'auto' } = req.body;
  
  if (!url) {
    return res.json({ success: false, error: 'No URL provided' });
  }
  
  // Service mappings (same as frontend)
  const services = {
    youtube: `https://y2mate.is/youtube/${extractId(url, 'youtube')}`,
    facebook: `https://fdown.net/?url=${encodeURIComponent(url)}`,
    instagram: `https://downloadgram.com/video-downloader.php?url=${encodeURIComponent(url)}`,
    tiktok: `https://snaptik.app/en?url=${encodeURIComponent(url)}`,
    twitter: `https://twdown.net/?url=${encodeURIComponent(url)}`,
    zoom: `https://zoom-video-downloader.com/?url=${encodeURIComponent(url)}`,
    auto: `https://en.savefrom.net/#url=${encodeURIComponent(url)}`
  };
  
  const service = services[siteType] || services.auto;
  
  res.json({
    success: true,
    downloadUrl: service,
    siteType: siteType,
    originalUrl: url,
    timestamp: new Date().toISOString()
  });
});

// Helper function for API
function extractId(url, siteType) {
  if (siteType === 'youtube') {
    const match = url.match(/v=([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : url;
  }
  return url;
}

// Start server
const HOST = process.env.RENDER ? '0.0.0.0' : '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`
  =========================================
  🎬 UNIVERSAL VIDEO DOWNLOADER
  📍 Port: ${PORT}
  🌐 Local: http://localhost:${PORT}
  ${process.env.RENDER ? '🌐 Cloud: Public URL from Render' : `🌐 Network: http://10.0.0.145:${PORT}`}
  =========================================
  ✅ Server ready!
  ✅ Supports: YouTube, Facebook, Instagram, TikTok, Twitter, Zoom, etc.
  ✅ Smart auto-detection
  ✅ Mobile & Desktop optimized
  =========================================
  `);
  
  if (process.env.RENDER) {
    console.log('🚀 Running on Render.com Cloud');
    console.log('📱 Share with anyone: https://youtube-downloader-lmti.onrender.com');
    console.log('💡 Ignore yt-dlp warning - Using external download services');
  }
});