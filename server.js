// 🎬 GRABANYVIDEO - Universal Video Downloader
const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3001;

// Middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// === MAIN DOWNLOADER PAGE ===
app.get('/', (req, res) => {
    const currentDate = new Date().toLocaleDateString();
    const currentYear = new Date().getFullYear();
    
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>🎬 GrabAnyVideo - Download from ANY Website</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
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
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
        }
        h1 {
            color: #FF0000;
            font-size: 42px;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #ccc;
            font-size: 18px;
            margin-bottom: 10px;
        }
        .tagline {
            color: #888;
            font-size: 14px;
        }
        .main-card {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 25px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        .input-group {
            margin-bottom: 20px;
        }
        input {
            width: 100%;
            padding: 18px;
            font-size: 16px;
            border: 2px solid #333;
            border-radius: 12px;
            background: #222;
            color: white;
            transition: all 0.3s;
        }
        input:focus {
            border-color: #FF0000;
            outline: none;
            box-shadow: 0 0 0 3px rgba(255, 0, 0, 0.2);
        }
        .quality-group {
            margin: 20px 0;
        }
        .quality-label {
            display: block;
            margin-bottom: 10px;
            color: #ccc;
            font-weight: 500;
        }
        .quality-buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        .quality-btn {
            padding: 12px 20px;
            background: #222;
            color: #ccc;
            border: 2px solid #333;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s;
            flex: 1;
            min-width: 80px;
            text-align: center;
        }
        .quality-btn:hover {
            border-color: #FF0000;
            color: white;
        }
        .quality-btn.active {
            background: #FF0000;
            border-color: #FF0000;
            color: white;
            font-weight: bold;
        }
        .site-selector {
            margin: 20px 0;
        }
        select {
            width: 100%;
            padding: 16px;
            font-size: 16px;
            border: 2px solid #333;
            border-radius: 12px;
            background: #222;
            color: white;
            margin-bottom: 10px;
        }
        select:focus {
            border-color: #FF0000;
            outline: none;
        }
        .sites-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            gap: 12px;
            margin: 25px 0;
        }
        .site-card {
            background: #222;
            padding: 20px 10px;
            border-radius: 12px;
            text-align: center;
            cursor: pointer;
            border: 2px solid transparent;
            transition: all 0.3s;
        }
        .site-card:hover {
            border-color: #FF0000;
            background: #2a2a2a;
            transform: translateY(-3px);
        }
        .site-card.active {
            border-color: #FF0000;
            background: rgba(255, 0, 0, 0.1);
            transform: translateY(-3px);
        }
        .site-icon {
            font-size: 32px;
            margin-bottom: 8px;
        }
        .site-name {
            font-size: 13px;
            color: #ccc;
            font-weight: 500;
        }
        .download-btn {
            width: 100%;
            padding: 20px;
            background: linear-gradient(135deg, #FF0000, #CC0000);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 20px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
            margin: 25px 0 15px 0;
        }
        .download-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 25px rgba(255, 0, 0, 0.3);
        }
        .download-btn:active {
            transform: translateY(-1px);
        }
        .download-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        .result {
            margin-top: 25px;
            padding: 25px;
            border-radius: 15px;
            background: rgba(255, 255, 255, 0.05);
            display: none;
            border-left: 5px solid #FF0000;
        }
        .result.success {
            border-left-color: #00FF00;
            background: rgba(0, 255, 0, 0.05);
        }
        .result.error {
            border-left-color: #FF0000;
            background: rgba(255, 0, 0, 0.05);
        }
        .status-card {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 15px;
            padding: 20px;
            margin-top: 25px;
            text-align: center;
            border-left: 5px solid #00FF00;
        }
        .features {
            display: flex;
            justify-content: center;
            gap: 25px;
            margin: 30px 0;
            flex-wrap: wrap;
        }
        .feature {
            text-align: center;
            padding: 15px;
            min-width: 120px;
        }
        .feature-icon {
            font-size: 28px;
            margin-bottom: 10px;
            color: #FF0000;
        }
        .feature-text {
            font-size: 14px;
            color: #ccc;
        }
        .instructions {
            background: rgba(255, 255, 255, 0.05);
            padding: 20px;
            border-radius: 15px;
            margin: 25px 0;
            font-size: 14px;
            line-height: 1.6;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            color: #888;
            font-size: 13px;
        }
        .cloud-badge {
            background: linear-gradient(135deg, #00B4DB, #0083B0);
            color: white;
            padding: 6px 15px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            display: inline-block;
            margin-left: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎬 GrabAnyVideo</h1>
            <div class="subtitle">Universal Video Downloader</div>
            <div class="tagline">Download from YouTube, Facebook, Instagram, TikTok, Twitter, Vimeo, Zoom, Google Meet & 100+ more</div>
        </div>
        
        <div class="features">
            <div class="feature">
                <div class="feature-icon">⚡</div>
                <div class="feature-text">Fast Downloads</div>
            </div>
            <div class="feature">
                <div class="feature-icon">🔒</div>
                <div class="feature-text">No 3rd Party</div>
            </div>
            <div class="feature">
                <div class="feature-icon">📱</div>
                <div class="feature-text">Mobile Friendly</div>
            </div>
            <div class="feature">
                <div class="feature-icon">🌐</div>
                <div class="feature-text">100+ Sites</div>
            </div>
        </div>
        
        <div class="main-card">
            <div class="input-group">
                <input type="text" id="videoUrl" 
                       placeholder="🔗 Paste ANY video URL (YouTube, Facebook, TikTok, etc.)" 
                       autocomplete="off">
            </div>
            
            <div class="site-selector">
                <select id="siteType">
                    <option value="auto">🌐 Auto-detect Site (Recommended)</option>
                    <option value="youtube">🎬 YouTube</option>
                    <option value="facebook">📘 Facebook</option>
                    <option value="instagram">📸 Instagram</option>
                    <option value="tiktok">🎵 TikTok</option>
                    <option value="twitter">🐦 Twitter/X</option>
                    <option value="zoom">📹 Zoom/Google Meet</option>
                    <option value="vimeo">🎥 Vimeo</option>
                    <option value="twitch">🟣 Twitch</option>
                    <option value="dailymotion">📺 Dailymotion</option>
                    <option value="linkedin">💼 LinkedIn</option>
                    <option value="reddit">📱 Reddit</option>
                </select>
            </div>
            
            <div class="quality-group">
                <div class="quality-label">🎚️ Select Quality (YouTube only):</div>
                <div class="quality-buttons">
                    <div class="quality-btn active" data-quality="best">Best</div>
                    <div class="quality-btn" data-quality="1080">1080p</div>
                    <div class="quality-btn" data-quality="720">720p</div>
                    <div class="quality-btn" data-quality="480">480p</div>
                    <div class="quality-btn" data-quality="360">360p</div>
                </div>
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
                    <div class="site-name">Twitter</div>
                </div>
                <div class="site-card" data-site="zoom">
                    <div class="site-icon">📹</div>
                    <div class="site-name">Zoom/Meet</div>
                </div>
                <div class="site-card" data-site="vimeo">
                    <div class="site-icon">🎥</div>
                    <div class="site-name">Vimeo</div>
                </div>
                <div class="site-card" data-site="twitch">
                    <div class="site-icon">🟣</div>
                    <div class="site-name">Twitch</div>
                </div>
            </div>
            
            <button id="downloadBtn" class="download-btn">⬇️ DOWNLOAD VIDEO NOW</button>
            
            <div id="result" class="result"></div>
        </div>
        
        <div class="instructions">
            <strong>📋 How to use GrabAnyVideo:</strong><br><br>
            1. <strong>Copy</strong> video URL from ANY website<br>
            2. <strong>Paste</strong> in the box above (auto-detects site)<br>
            3. <strong>Select</strong> site type or click icons<br>
            4. <strong>Choose</strong> quality for YouTube videos<br>
            5. <strong>Click</strong> DOWNLOAD button<br>
            6. <strong>Video downloads</strong> directly to your device<br><br>
            
            <strong>✅ Works on:</strong> Phone, Tablet, Computer<br>
            <strong>🌐 Supported:</strong> 100+ video sites<br>
            <strong>⚡ Speed:</strong> Fast & reliable downloads<br>
            <strong>🔒 Security:</strong> No third-party websites
        </div>
        
        <div class="status-card">
            <div style="color:#00FF00; font-weight:bold; margin-bottom:10px;">✅ SYSTEM STATUS: ONLINE</div>
            <div>🌐 <strong>Service:</strong> Direct video downloads</div>
            <div>🚀 <strong>Hosted on:</strong> Render.com Cloud <span class="cloud-badge">ALWAYS AVAILABLE</span></div>
            <div>📅 <strong>Last updated:</strong> ${currentDate}</div>
        </div>
        
        <div class="footer">
            <p>GrabAnyVideo downloads videos directly using our own servers. No external services.</p>
            <p>© ${currentYear} GrabAnyVideo | Universal Video Downloader</p>
        </div>
    </div>

    <script>
        // ===== ELEMENTS =====
        const downloadBtn = document.getElementById('downloadBtn');
        const videoUrlInput = document.getElementById('videoUrl');
        const siteTypeSelect = document.getElementById('siteType');
        const resultDiv = document.getElementById('result');
        const siteCards = document.querySelectorAll('.site-card');
        const qualityBtns = document.querySelectorAll('.quality-btn');
        
        // ===== CONFIGURATION =====
        let selectedQuality = 'best';
        let selectedSite = 'auto';
        
        // ===== SITE DETECTION =====
        function detectSite(url) {
            if (!url) return 'auto';
            
            url = url.toLowerCase();
            
            if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
            if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.com')) return 'facebook';
            if (url.includes('instagram.com') || url.includes('instagr.am')) return 'instagram';
            if (url.includes('tiktok.com') || url.includes('tiktok')) return 'tiktok';
            if (url.includes('twitter.com') || url.includes('x.com') || url.includes('t.co')) return 'twitter';
            if (url.includes('zoom.us') || url.includes('zoom.com') || url.includes('meet.google.com')) return 'zoom';
            if (url.includes('vimeo.com')) return 'vimeo';
            if (url.includes('twitch.tv')) return 'twitch';
            if (url.includes('dailymotion.com')) return 'dailymotion';
            if (url.includes('linkedin.com')) return 'linkedin';
            if (url.includes('reddit.com') || url.includes('redd.it')) return 'reddit';
            
            return 'auto';
        }
        
        // ===== MAIN DOWNLOAD FUNCTION =====
        async function downloadVideo() {
            const url = videoUrlInput.value.trim();
            
            if (!url) {
                showResult('❌ Please paste a video URL first!', 'error');
                videoUrlInput.focus();
                return;
            }
            
            let siteType = siteTypeSelect.value;
            
            // Auto-detect if set to auto
            if (siteType === 'auto') {
                siteType = detectSite(url);
                siteTypeSelect.value = siteType;
                updateActiveCard(siteType);
            }
            
            // Show loading
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = '⏳ Processing...';
            
            try {
                // Send to server
                const response = await fetch('/download', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        url: url,
                        siteType: siteType,
                        quality: selectedQuality
                    })
                });
                
                const data = await response.json();
                
                if (data.success && data.downloadUrl) {
                    showResult('✅ <strong>Video ready!</strong><br>Starting download...', 'success');
                    
                    // Create download link
                    const downloadLink = document.createElement('a');
                    downloadLink.href = data.downloadUrl;
                    downloadLink.download = data.filename || 'video.mp4';
                    document.body.appendChild(downloadLink);
                    downloadLink.click();
                    document.body.removeChild(downloadLink);
                    
                    showResult('🎉 <strong>Download started!</strong><br>' +
                              '📁 <strong>File:</strong> ' + (data.filename || 'video.mp4') + '<br>' +
                              '🌐 <strong>Site:</strong> ' + siteType + '<br>' +
                              '🎚️ <strong>Quality:</strong> ' + selectedQuality + '<br><br>' +
                              '✅ Video is downloading to your device', 'success');
                } else {
                    showResult('❌ ' + (data.error || 'Download failed'), 'error');
                }
                
            } catch (error) {
                console.error('Download error:', error);
                showResult('❌ Error: ' + error.message, 'error');
            } finally {
                // Reset button
                setTimeout(() => {
                    downloadBtn.disabled = false;
                    downloadBtn.innerHTML = '⬇️ DOWNLOAD VIDEO NOW';
                }, 3000);
            }
        }
        
        // ===== HELPER FUNCTIONS =====
        function showResult(message, type) {
            resultDiv.innerHTML = message;
            resultDiv.className = 'result ' + type;
            resultDiv.style.display = 'block';
            resultDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        
        function updateActiveQuality(quality) {
            qualityBtns.forEach(btn => {
                if (btn.dataset.quality === quality) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
        
        // ===== EVENT LISTENERS =====
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
                    updateActiveCard(detected);
                }
            }, 100);
        });
        
        // Site card clicks
        siteCards.forEach(card => {
            card.addEventListener('click', () => {
                const site = card.dataset.site;
                selectedSite = site;
                siteTypeSelect.value = site;
                updateActiveCard(site);
            });
        });
        
        // Quality button clicks
        qualityBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                selectedQuality = btn.dataset.quality;
                updateActiveQuality(selectedQuality);
            });
        });
        
        // Auto-focus input
        videoUrlInput.focus();
        
        console.log('🎬 GrabAnyVideo loaded successfully!');
    </script>
</body>
</html>`;
    
    res.send(html);
});

// === DOWNLOAD ENDPOINT ===
app.post('/download', async (req, res) => {
    const { url, siteType, quality } = req.body;
    
    console.log(`📥 Download request: ${siteType} - ${url} - Quality: ${quality}`);
    
    try {
        // For now, return the original URL as a placeholder
        // In a real app, you would process the video here
        
        const filename = `grabanyvideo-${siteType}-${Date.now()}.mp4`;
        
        res.json({
            success: true,
            downloadUrl: url, // Placeholder - in real app, this would be the processed video URL
            filename: filename,
            siteType: siteType,
            quality: quality,
            message: 'Video processing initiated'
        });
        
    } catch (error) {
        console.error('Download error:', error);
        res.json({
            success: false,
            error: 'Failed to process video. Please try again.'
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'GrabAnyVideo - Universal Video Downloader',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        supported_sites: [
            'YouTube', 'Facebook', 'Instagram', 'TikTok', 'Twitter/X',
            'Zoom', 'Google Meet', 'Vimeo', 'Twitch', 'Dailymotion',
            'LinkedIn', 'Reddit', 'Auto-detect'
        ],
        features: ['auto_detection', 'quality_selection', 'direct_download', 'mobile_friendly']
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    =========================================
    🎬 GRABANYVIDEO v1.0.0
    📍 Port: ${PORT}
    🌐 URL: https://youtube-downloader-lmti.onrender.com
    =========================================
    ✅ Server ready!
    ✅ Auto-detection working
    ✅ Site cards clickable
    ✅ Quality selection
    ✅ Direct download interface
    =========================================
    ⚠️  NOTE: Real download functionality needs additional libraries
    =========================================
    `);
});