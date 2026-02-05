// UNIVERSAL VIDEO DOWNLOADER - Works for ALL Sites
const express = require('express');
const app = express();

const PORT = process.env.PORT || 3001;

// Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
app.use(express.json());
app.use(express.static(__dirname));

// === MAIN UNIVERSAL DOWNLOADER PAGE ===
app.get('/', (req, res) => {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>Universal Video Downloader</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #0f0f0f;
        color: white;
        min-height: 100vh;
        padding: 20px;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
      }
      .header {
        text-align: center;
        margin-bottom: 30px;
      }
      h1 {
        color: #FF0000;
        font-size: 32px;
        margin-bottom: 10px;
      }
      .subtitle {
        color: #888;
        font-size: 16px;
      }
      .input-area {
        background: #1a1a1a;
        padding: 25px;
        border-radius: 15px;
        margin-bottom: 20px;
      }
      input {
        width: 100%;
        padding: 16px;
        font-size: 16px;
        border: 2px solid #333;
        border-radius: 10px;
        background: #222;
        color: white;
        margin-bottom: 15px;
      }
      input:focus {
        border-color: #FF0000;
        outline: none;
      }
      select {
        width: 100%;
        padding: 14px;
        font-size: 16px;
        border: 2px solid #333;
        border-radius: 10px;
        background: #222;
        color: white;
        margin-bottom: 15px;
      }
      button {
        width: 100%;
        padding: 18px;
        background: #FF0000;
        color: white;
        border: none;
        border-radius: 10px;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        transition: 0.2s;
      }
      button:hover {
        background: #CC0000;
        transform: translateY(-2px);
      }
      .sites {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin: 20px 0;
      }
      .site {
        background: #222;
        padding: 15px;
        border-radius: 10px;
        text-align: center;
        cursor: pointer;
        border: 2px solid transparent;
      }
      .site:hover, .site.active {
        border-color: #FF0000;
        background: #2a2a2a;
      }
      .site-icon {
        font-size: 24px;
        margin-bottom: 5px;
      }
      .site-name {
        font-size: 12px;
        color: #ccc;
      }
      .result {
        margin-top: 20px;
        padding: 20px;
        background: #1a1a1a;
        border-radius: 10px;
        display: none;
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
        background: #1a1a1a;
        border-radius: 10px;
        text-align: center;
        font-size: 14px;
        color: #888;
      }
      .instructions {
        background: #1a1a1a;
        padding: 15px;
        border-radius: 10px;
        margin-top: 20px;
        font-size: 14px;
        color: #aaa;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🎬 Universal Video Downloader</h1>
        <div class="subtitle">Download videos from ANY website</div>
      </div>
      
      <div class="input-area">
        <input type="text" id="videoUrl" placeholder="Paste video URL from ANY site..." autocomplete="off">
        
        <select id="siteType">
          <option value="auto">🌐 Auto-detect Site</option>
          <option value="youtube">🎬 YouTube</option>
          <option value="facebook">📘 Facebook</option>
          <option value="instagram">📸 Instagram</option>
          <option value="tiktok">🎵 TikTok</option>
          <option value="twitter">🐦 Twitter/X</option>
          <option value="zoom">📹 Zoom/Teams</option>
          <option value="vimeo">🎥 Vimeo</option>
          <option value="twitch">🟣 Twitch</option>
        </select>
        
        <div class="sites">
          <div class="site" data-site="youtube">
            <div class="site-icon">🎬</div>
            <div class="site-name">YouTube</div>
          </div>
          <div class="site" data-site="facebook">
            <div class="site-icon">📘</div>
            <div class="site-name">Facebook</div>
          </div>
          <div class="site" data-site="instagram">
            <div class="site-icon">📸</div>
            <div class="site-name">Instagram</div>
          </div>
          <div class="site" data-site="tiktok">
            <div class="site-icon">🎵</div>
            <div class="site-name">TikTok</div>
          </div>
          <div class="site" data-site="twitter">
            <div class="site-icon">🐦</div>
            <div class="site-name">Twitter</div>
          </div>
          <div class="site" data-site="zoom">
            <div class="site-icon">📹</div>
            <div class="site-name">Zoom</div>
          </div>
        </div>
        
        <button id="downloadBtn">⬇️ Download Video</button>
      </div>
      
      <div id="result" class="result"></div>
      
      <div class="instructions">
        <strong>How to use:</strong><br>
        1. Copy video URL from ANY website<br>
        2. Paste above (auto-detects site)<br>
        3. Click download button<br>
        4. Follow instructions on download site<br>
        <br>
        <strong>Supported sites:</strong> YouTube, Facebook, Instagram, TikTok, Twitter/X, Zoom, Vimeo, Twitch, and 100+ more
      </div>
      
      <div class="status">
        ✅ <strong>Status:</strong> Online<br>
        🌐 <strong>Service:</strong> Using multiple download services<br>
        🚀 <strong>Hosted on:</strong> Render.com Cloud
      </div>
    </div>

    <script>
      // Elements
      const downloadBtn = document.getElementById('downloadBtn');
      const videoUrlInput = document.getElementById('videoUrl');
      const siteTypeSelect = document.getElementById('siteType');
      const resultDiv = document.getElementById('result');
      const sites = document.querySelectorAll('.site');
      
      // Auto-detect site from URL
      function detectSite(url) {
        if (!url) return 'auto';
        if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
        if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
        if (url.includes('instagram.com')) return 'instagram';
        if (url.includes('tiktok.com')) return 'tiktok';
        if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
        if (url.includes('zoom.us') || url.includes('teams.microsoft.com')) return 'zoom';
        if (url.includes('vimeo.com')) return 'vimeo';
        if (url.includes('twitch.tv')) return 'twitch';
        return 'auto';
      }
      
      // Download services for each site
      const services = {
        youtube: (url) => {
          const match = url.match(/v=([a-zA-Z0-9_-]{11})/) || url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
          const videoId = match ? match[1] : 'video';
          return 'https://y2mate.is/youtube/' + videoId;
        },
        facebook: (url) => 'https://fdown.net/?url=' + encodeURIComponent(url),
        instagram: (url) => 'https://downloadgram.com/video-downloader.php?url=' + encodeURIComponent(url),
        tiktok: (url) => 'https://snaptik.app/en?url=' + encodeURIComponent(url),
        twitter: (url) => 'https://twdown.net/?url=' + encodeURIComponent(url),
        zoom: (url) => 'https://zoom-video-downloader.com/?url=' + encodeURIComponent(url),
        vimeo: (url) => 'https://vimeodownload.com/?url=' + encodeURIComponent(url),
        twitch: (url) => 'https://twitchdownloader.com/?url=' + encodeURIComponent(url),
        auto: (url) => 'https://en.savefrom.net/#url=' + encodeURIComponent(url)
      };
      
      // Main download function
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
          updateActiveSite(siteType);
        }
        
        // Get download URL
        const service = services[siteType] || services.auto;
        const downloadUrl = service(url);
        
        // Show result
        showResult(\`✅ <strong>Opening download page...</strong><br>
                   <strong>Site detected:</strong> \${siteType}<br>
                   <strong>Using service:</strong> \${getServiceName(siteType)}<br>
                   <small>Page will open in new tab. Follow instructions on the download site.</small>\`, 'success');
        
        // Open download page
        window.open(downloadUrl, '_blank');
        
        // Button feedback
        downloadBtn.disabled = true;
        downloadBtn.textContent = '✅ Opening...';
        setTimeout(() => {
          downloadBtn.disabled = false;
          downloadBtn.textContent = '⬇️ Download Video';
        }, 2000);
      }
      
      // Helper functions
      function showResult(message, type) {
        resultDiv.innerHTML = message;
        resultDiv.className = 'result ' + type;
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
          auto: 'savefrom.net'
        };
        return names[siteType] || 'download service';
      }
      
      function updateActiveSite(siteType) {
        sites.forEach(site => {
          if (site.dataset.site === siteType) {
            site.classList.add('active');
          } else {
            site.classList.remove('active');
          }
        });
      }
      
      // Event listeners
      downloadBtn.addEventListener('click', downloadVideo);
      
      videoUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') downloadVideo();
      });
      
      videoUrlInput.addEventListener('paste', () => {
        setTimeout(() => {
          const url = videoUrlInput.value;
          if (url) {
            const detected = detectSite(url);
            siteTypeSelect.value = detected;
            updateActiveSite(detected);
          }
        }, 100);
      });
      
      // Site selection
      sites.forEach(site => {
        site.addEventListener('click', () => {
          const siteType = site.dataset.site;
          siteTypeSelect.value = siteType;
          updateActiveSite(siteType);
        });
      });
      
      // Auto-focus
      videoUrlInput.focus();
    </script>
  </body>
  </html>
  `;
  
  res.send(html);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Universal Video Downloader',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    supported_sites: ['YouTube', 'Facebook', 'Instagram', 'TikTok', 'Twitter/X', 'Zoom', 'Vimeo', 'Twitch', 'Auto-detect'],
    note: 'Using external download services - no yt-dlp required'
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  =========================================
  🎬 UNIVERSAL VIDEO DOWNLOADER v2.0
  📍 Port: ${PORT}
  🌐 URL: https://youtube-downloader-lmti.onrender.com
  =========================================
  ✅ Server ready!
  ✅ Supports ALL video sites
  ✅ Mobile & Desktop optimized
  ✅ Cloud hosted
  =========================================
  `);
});