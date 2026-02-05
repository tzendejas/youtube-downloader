// 🎬 GRABANYVIDEO - Universal Video Downloader (SIMPLIFIED WORKING VERSION)
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// CORRECT IMPORTS
const ytdl = require('@distube/ytdl-core');
// We'll handle yt-dlp differently since the package has issues

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Create downloads directory
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

// Serve downloaded files
app.use('/downloads', express.static(downloadsDir));

// === SITE DETECTION ===
function detectSite(url) {
    if (!url) return 'auto';
    
    url = url.toLowerCase();
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('vimeo.com')) return 'vimeo';
    if (url.includes('twitch.tv')) return 'twitch';
    
    return 'auto';
}

// === YOUTUBE DOWNLOADER (WORKS) ===
async function downloadYouTube(url, quality = 'best') {
    return new Promise(async (resolve, reject) => {
        try {
            console.log('🎬 Downloading YouTube video:', url);
            
            // Get video info
            const info = await ytdl.getInfo(url);
            const videoId = info.videoDetails.videoId;
            const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
            
            // Choose format based on quality
            let format;
            const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
            
            if (quality === 'best') {
                format = formats[0];
            } else if (quality === '1080') {
                format = formats.find(f => f.qualityLabel === '1080p');
            } else if (quality === '720') {
                format = formats.find(f => f.qualityLabel === '720p');
            } else if (quality === '480') {
                format = formats.find(f => f.qualityLabel === '480p');
            } else if (quality === '360') {
                format = formats.find(f => f.qualityLabel === '360p');
            }
            
            if (!format) format = formats[0];
            
            const filename = `grabanyvideo-youtube-${videoId}-${Date.now()}.mp4`;
            const filepath = path.join(downloadsDir, filename);
            
            console.log(`📥 Downloading: ${title} [${format.qualityLabel || 'best'}]`);
            
            // Download video
            const stream = ytdl.downloadFromInfo(info, { format: format });
            const fileStream = fs.createWriteStream(filepath);
            
            let downloadedBytes = 0;
            let totalBytes = 0;
            
            // Track download progress
            stream.on('progress', (chunkLength, downloaded, total) => {
                downloadedBytes = downloaded;
                totalBytes = total;
            });
            
            stream.pipe(fileStream);
            
            fileStream.on('finish', () => {
                console.log(`✅ Downloaded: ${filename}`);
                const stats = fs.statSync(filepath);
                resolve({
                    success: true,
                    filename: filename,
                    filepath: filepath,
                    title: title,
                    quality: format.qualityLabel || 'best',
                    duration: info.videoDetails.lengthSeconds,
                    size: stats.size,
                    downloadUrl: `/downloads/${filename}`
                });
            });
            
            stream.on('error', (error) => {
                console.error('Stream error:', error);
                reject(new Error('Failed to download video stream'));
            });
            
            fileStream.on('error', (error) => {
                console.error('File error:', error);
                reject(new Error('Failed to save video file'));
            });
            
        } catch (error) {
            console.error('YouTube download error:', error);
            reject(new Error(`YouTube download failed: ${error.message}`));
        }
    });
}

// === OTHER SITES DOWNLOADER (Using Public APIs) ===
async function downloadOtherSites(url, siteType) {
    try {
        console.log(`🌐 Downloading ${siteType} video:`, url);
        
        // Different approach for each site
        let apiUrl;
        
        if (siteType === 'tiktok') {
            // TikTok - use API
            apiUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
        } else if (siteType === 'instagram') {
            // Instagram - simplified approach
            const shortcode = url.match(/instagram\.com\/(?:p|reel|tv)\/([^/?]+)/);
            if (shortcode) {
                apiUrl = `https://www.instagram.com/p/${shortcode[1]}/?__a=1&__d=dis`;
            }
        }
        
        if (apiUrl) {
            const response = await axios.get(apiUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            // Extract video URL (simplified - would need more logic for production)
            let videoUrl = null;
            const data = response.data;
            
            if (siteType === 'tiktok' && data.html) {
                // Extract from embed code
                const match = data.html.match(/src="([^"]+)"/);
                if (match) videoUrl = match[1];
            }
            
            if (videoUrl) {
                const filename = `grabanyvideo-${siteType}-${Date.now()}.mp4`;
                const filepath = path.join(downloadsDir, filename);
                
                const videoResponse = await axios({
                    method: 'GET',
                    url: videoUrl,
                    responseType: 'stream',
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                const writer = fs.createWriteStream(filepath);
                videoResponse.data.pipe(writer);
                
                return new Promise((resolve, reject) => {
                    writer.on('finish', () => {
                        const stats = fs.statSync(filepath);
                        resolve({
                            success: true,
                            filename: filename,
                            filepath: filepath,
                            title: data.title || `${siteType} Video`,
                            quality: 'best',
                            size: stats.size,
                            downloadUrl: `/downloads/${filename}`
                        });
                    });
                    writer.on('error', reject);
                });
            }
        }
        
        // Fallback: Redirect to external service for now
        // In production, you'd want to implement proper downloaders
        throw new Error(`Direct download for ${siteType} not available yet. YouTube downloads work perfectly.`);
        
    } catch (error) {
        console.error(`${siteType} download error:`, error);
        throw new Error(`Failed to download ${siteType} video: ${error.message}`);
    }
}

// === MAIN DOWNLOAD API ===
app.post('/api/download', async (req, res) => {
    try {
        const { url, siteType = 'auto', quality = 'best' } = req.body;
        
        if (!url) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a video URL'
            });
        }
        
        console.log(`🚀 Processing: ${url} (${siteType}, ${quality})`);
        
        // Detect site if auto
        const detectedSite = siteType === 'auto' ? detectSite(url) : siteType;
        
        let result;
        
        // YouTube works perfectly, other sites have limited support
        if (detectedSite === 'youtube') {
            result = await downloadYouTube(url, quality);
        } else {
            result = await downloadOtherSites(url, detectedSite);
        }
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Video downloaded successfully!',
                downloadUrl: result.downloadUrl,
                filename: result.filename,
                title: result.title,
                quality: result.quality,
                size: result.size,
                site: detectedSite
            });
        } else {
            throw new Error('Download failed');
        }
        
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            suggestion: 'Try a YouTube video for guaranteed success'
        });
    }
});

// === DIRECT DOWNLOAD ENDPOINT ===
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(downloadsDir, filename);
    
    if (fs.existsSync(filepath)) {
        res.download(filepath, filename, (err) => {
            if (err) {
                console.error('Download error:', err);
            }
        });
    } else {
        res.status(404).send('File not found');
    }
});

// === FRONTEND PAGE ===
app.get('/', (req, res) => {
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>🎬 GrabAnyVideo - YouTube Downloader</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
        .main-card {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 25px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }
        input {
            width: 100%;
            padding: 18px;
            font-size: 16px;
            border: 2px solid #333;
            border-radius: 12px;
            background: #222;
            color: white;
            margin-bottom: 20px;
        }
        input:focus {
            border-color: #FF0000;
            outline: none;
            box-shadow: 0 0 0 3px rgba(255, 0, 0, 0.2);
        }
        .quality-buttons {
            display: flex;
            gap: 10px;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        .quality-btn {
            padding: 12px 20px;
            background: #222;
            color: #ccc;
            border: 2px solid #333;
            border-radius: 10px;
            cursor: pointer;
            flex: 1;
            min-width: 80px;
            text-align: center;
        }
        .quality-btn.active {
            background: #FF0000;
            border-color: #FF0000;
            color: white;
            font-weight: bold;
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
            margin: 20px 0;
        }
        .download-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 25px rgba(255, 0, 0, 0.3);
        }
        .download-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .result {
            margin-top: 25px;
            padding: 25px;
            border-radius: 15px;
            background: rgba(255, 255, 255, 0.05);
            display: none;
        }
        .result.success {
            border-left: 5px solid #00FF00;
            background: rgba(0, 255, 0, 0.05);
        }
        .result.error {
            border-left: 5px solid #FF0000;
            background: rgba(255, 0, 0, 0.05);
        }
        .progress-bar {
            width: 100%;
            height: 20px;
            background: #222;
            border-radius: 10px;
            margin: 20px 0;
            overflow: hidden;
            display: none;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #FF0000, #FF6B6B);
            width: 0%;
            transition: width 0.3s;
        }
        .features {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 30px 0;
        }
        .feature {
            background: rgba(255, 255, 255, 0.05);
            padding: 20px;
            border-radius: 12px;
            text-align: center;
        }
        .feature-icon {
            font-size: 24px;
            margin-bottom: 10px;
            color: #FF0000;
        }
        .site-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin: 20px 0;
        }
        .site-icon {
            background: #222;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
        }
        .site-icon:hover {
            background: #2a2a2a;
            transform: translateY(-3px);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎬 GrabAnyVideo</h1>
            <div class="subtitle">YouTube Video Downloader</div>
            <div class="subtitle" style="font-size:14px;color:#888;">(Other sites coming soon)</div>
        </div>
        
        <div class="features">
            <div class="feature">
                <div class="feature-icon">⚡</div>
                <div>Fast Downloads</div>
            </div>
            <div class="feature">
                <div class="feature-icon">🔒</div>
                <div>No 3rd Party</div>
            </div>
            <div class="feature">
                <div class="feature-icon">📱</div>
                <div>All Devices</div>
            </div>
            <div class="feature">
                <div class="feature-icon">🎬</div>
                <div>YouTube Works</div>
            </div>
        </div>
        
        <div class="main-card">
            <input type="text" id="videoUrl" 
                   placeholder="🔗 Paste YouTube URL here..." 
                   autocomplete="off">
            
            <div class="site-grid">
                <div class="site-icon" onclick="selectSite('youtube')">🎬 YouTube</div>
                <div class="site-icon" onclick="selectSite('tiktok')" style="opacity:0.5">🎵 TikTok</div>
                <div class="site-icon" onclick="selectSite('instagram')" style="opacity:0.5">📸 Instagram</div>
                <div class="site-icon" onclick="selectSite('facebook')" style="opacity:0.5">📘 Facebook</div>
            </div>
            
            <div style="margin:20px 0;color:#ccc;font-size:14px;">
                ✅ <strong>YouTube:</strong> Full support with quality selection<br>
                ⚠️ <strong>Other sites:</strong> Limited support (coming soon)
            </div>
            
            <div class="quality-buttons">
                <div class="quality-btn active" onclick="selectQuality('best')">Best</div>
                <div class="quality-btn" onclick="selectQuality('1080')">1080p</div>
                <div class="quality-btn" onclick="selectQuality('720')">720p</div>
                <div class="quality-btn" onclick="selectQuality('480')">480p</div>
                <div class="quality-btn" onclick="selectQuality('360')">360p</div>
            </div>
            
            <button id="downloadBtn" class="download-btn">⬇️ DOWNLOAD YOUTUBE VIDEO</button>
            
            <div class="progress-bar" id="progressBar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
            
            <div id="result" class="result"></div>
        </div>
    </div>

    <script>
        let selectedQuality = 'best';
        let selectedSite = 'youtube';
        
        function selectQuality(quality) {
            selectedQuality = quality;
            document.querySelectorAll('.quality-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');
        }
        
        function selectSite(site) {
            selectedSite = site;
            if (site === 'youtube') {
                document.getElementById('downloadBtn').textContent = '⬇️ DOWNLOAD YOUTUBE VIDEO';
            } else {
                document.getElementById('downloadBtn').textContent = `⬇️ DOWNLOAD ${site.toUpperCase()} VIDEO`;
            }
        }
        
        async function downloadVideo() {
            const url = document.getElementById('videoUrl').value.trim();
            
            if (!url) {
                showResult('❌ Please paste a video URL', 'error');
                return;
            }
            
            // Check if it's YouTube
            if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
                showResult('⚠️ Currently only YouTube is fully supported. Other sites coming soon!', 'error');
                return;
            }
            
            const downloadBtn = document.getElementById('downloadBtn');
            const progressBar = document.getElementById('progressBar');
            const progressFill = document.getElementById('progressFill');
            const resultDiv = document.getElementById('result');
            
            // Show loading
            downloadBtn.disabled = true;
            downloadBtn.textContent = '⏳ Processing...';
            progressBar.style.display = 'block';
            updateProgress(10);
            showResult('🔍 Processing YouTube video...', 'success');
            
            try {
                updateProgress(30);
                
                const response = await fetch('/api/download', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: url,
                        siteType: selectedSite,
                        quality: selectedQuality
                    })
                });
                
                updateProgress(60);
                
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.error || 'Download failed');
                }
                
                updateProgress(90);
                showResult('✅ Video ready! Starting download...', 'success');
                
                // Start download
                setTimeout(() => {
                    const link = document.createElement('a');
                    link.href = data.downloadUrl;
                    link.download = data.filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }, 1000);
                
                showResult(
                    '🎉 <strong>Download started!</strong><br>' +
                    '📁 <strong>File:</strong> ' + data.filename + '<br>' +
                    '🎬 <strong>Title:</strong> ' + data.title + '<br>' +
                    '🎚️ <strong>Quality:</strong> ' + data.quality + '<br>' +
                    '💾 <strong>Size:</strong> ' + formatBytes(data.size) + '<br><br>' +
                    '✅ Video is downloading to your device',
                    'success'
                );
                updateProgress(100);
                
            } catch (error) {
                console.error('Error:', error);
                showResult('❌ Error: ' + error.message, 'error');
            } finally {
                setTimeout(() => {
                    downloadBtn.disabled = false;
                    downloadBtn.textContent = selectedSite === 'youtube' 
                        ? '⬇️ DOWNLOAD YOUTUBE VIDEO' 
                        : `⬇️ DOWNLOAD ${selectedSite.toUpperCase()} VIDEO`;
                    progressBar.style.display = 'none';
                    progressFill.style.width = '0%';
                }, 5000);
            }
        }
        
        function showResult(message, type) {
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = message;
            resultDiv.className = 'result ' + type;
            resultDiv.style.display = 'block';
        }
        
        function updateProgress(percent) {
            document.getElementById('progressFill').style.width = percent + '%';
        }
        
        function formatBytes(bytes) {
            if (!bytes) return 'Unknown';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        // Event listeners
        document.getElementById('downloadBtn').addEventListener('click', downloadVideo);
        document.getElementById('videoUrl').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') downloadVideo();
        });
        
        // Auto-detect YouTube on paste
        document.getElementById('videoUrl').addEventListener('paste', () => {
            setTimeout(() => {
                const url = document.getElementById('videoUrl').value;
                if (url.includes('youtube.com') || url.includes('youtu.be')) {
                    selectSite('youtube');
                }
            }, 100);
        });
        
        // Focus input
        document.getElementById('videoUrl').focus();
    </script>
</body>
</html>`;
    
    res.send(html);
});

// === HEALTH CHECK ===
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'GrabAnyVideo - YouTube Downloader',
        version: '3.1.0',
        timestamp: new Date().toISOString(),
        features: ['youtube_downloads', 'quality_selection', 'no_3rd_party'],
        note: 'YouTube downloads work perfectly. Other sites coming soon.'
    });
});

// === START SERVER ===
app.listen(PORT, () => {
    console.log(`
    =========================================
    🎬 GRABANYVIDEO v3.1
    📍 Port: ${PORT}
    =========================================
    ✅ YouTube downloads WORKING!
    ✅ Quality selection
    ✅ Direct downloads
    ✅ No 3rd party
    =========================================
    💡 Currently: YouTube fully supported
    💡 Coming soon: TikTok, Instagram, etc.
    =========================================
    `);
});