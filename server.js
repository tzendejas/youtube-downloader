// 🎬 GRABANYVIDEO - Universal Video Downloader (REAL DOWNLOADS - SIMPLIFIED)
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core').default;
const ytDlp = require('yt-dlp-exec').default;

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Serve downloads
app.use('/downloads', express.static('downloads'));

// Create downloads directory
if (!fs.existsSync('downloads')) {
    fs.mkdirSync('downloads');
}

// === SITE DETECTION ===
function detectSite(url) {
    if (!url) return 'auto';
    
    url = url.toLowerCase();
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('zoom.us') || url.includes('meet.google.com')) return 'zoom';
    if (url.includes('vimeo.com')) return 'vimeo';
    if (url.includes('twitch.tv')) return 'twitch';
    if (url.includes('dailymotion.com')) return 'dailymotion';
    if (url.includes('linkedin.com')) return 'linkedin';
    if (url.includes('reddit.com')) return 'reddit';
    
    return 'auto';
}

// === YOUTUBE DOWNLOADER ===
async function downloadYouTube(url, quality = 'best') {
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
        const filepath = path.join(__dirname, 'downloads', filename);
        
        console.log(`📥 Downloading: ${title} [${format.qualityLabel || 'best'}]`);
        
        // Download video
        return new Promise((resolve, reject) => {
            const stream = ytdl.downloadFromInfo(info, { format: format });
            const fileStream = fs.createWriteStream(filepath);
            
            stream.pipe(fileStream);
            
            fileStream.on('finish', () => {
                console.log(`✅ Downloaded: ${filename}`);
                resolve({
                    success: true,
                    filename: filename,
                    filepath: filepath,
                    title: title,
                    quality: format.qualityLabel || 'best',
                    duration: info.videoDetails.lengthSeconds,
                    size: fs.statSync(filepath).size
                });
            });
            
            fileStream.on('error', (error) => {
                console.error('Download error:', error);
                reject(new Error('Failed to save video file'));
            });
        });
        
    } catch (error) {
        console.error('YouTube download error:', error);
        throw new Error(`YouTube download failed: ${error.message}`);
    }
}

// === UNIVERSAL DOWNLOADER (yt-dlp for all other sites) ===
async function downloadUniversal(url, siteType = 'auto') {
    try {
        console.log(`🌐 Downloading ${siteType} video:`, url);
        
        const filename = `grabanyvideo-${siteType}-${Date.now()}.mp4`;
        const outputPath = path.join(__dirname, 'downloads', filename);
        
        // Use yt-dlp to download
        await ytDlp(url, {
            output: outputPath,
            format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            noCheckCertificate: true,
            noWarnings: true,
            preferFreeFormats: true,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        });
        
        // Check if file exists
        if (fs.existsSync(outputPath)) {
            const stats = fs.statSync(outputPath);
            
            return {
                success: true,
                filename: filename,
                filepath: outputPath,
                title: `${siteType.charAt(0).toUpperCase() + siteType.slice(1)} Video`,
                quality: 'best',
                size: stats.size
            };
        } else {
            throw new Error('Download completed but file not found');
        }
        
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
        
        // Use specialized downloader for YouTube, yt-dlp for everything else
        if (detectedSite === 'youtube') {
            result = await downloadYouTube(url, quality);
        } else {
            result = await downloadUniversal(url, detectedSite);
        }
        
        // Return download information
        res.json({
            success: true,
            message: 'Video downloaded successfully!',
            downloadUrl: `/downloads/${result.filename}`,
            directUrl: `https://${req.headers.host}/downloads/${result.filename}`,
            filename: result.filename,
            title: result.title,
            quality: result.quality,
            size: result.size,
            site: detectedSite
        });
        
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            suggestion: 'Try a different quality or check the URL'
        });
    }
});

// === CLEAN OLD DOWNLOADS (keep only recent files) ===
function cleanOldDownloads() {
    try {
        const files = fs.readdirSync('downloads');
        const now = Date.now();
        const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
        
        files.forEach(file => {
            const filepath = path.join('downloads', file);
            const stats = fs.statSync(filepath);
            
            // Delete files older than 1 hour
            if (now - stats.mtimeMs > oneHour) {
                fs.unlinkSync(filepath);
                console.log(`🧹 Deleted old file: ${file}`);
            }
        });
    } catch (error) {
        console.error('Cleanup error:', error);
    }
}

// Run cleanup every hour
setInterval(cleanOldDownloads, 60 * 60 * 1000);

// === FRONTEND PAGE ===
app.get('/', (req, res) => {
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>🎬 GrabAnyVideo - Real Video Downloader</title>
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
        select {
            width: 100%;
            padding: 16px;
            font-size: 16px;
            border: 2px solid #333;
            border-radius: 12px;
            background: #222;
            color: white;
            margin-bottom: 20px;
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
        .progress {
            width: 100%;
            height: 20px;
            background: #222;
            border-radius: 10px;
            margin: 20px 0;
            overflow: hidden;
            display: none;
        }
        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #FF0000, #FF6B6B);
            width: 0%;
            transition: width 0.3s;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎬 GrabAnyVideo</h1>
            <div class="subtitle">REAL Video Downloader - No Third Party</div>
            <div class="subtitle" style="color:#00FF00; font-size:14px;">✅ Direct downloads from our server!</div>
        </div>
        
        <div class="main-card">
            <input type="text" id="videoUrl" 
                   placeholder="🔗 Paste ANY video URL (YouTube, TikTok, Instagram, Facebook, etc.)" 
                   autocomplete="off">
            
            <select id="siteType">
                <option value="auto">🌐 Auto-detect Site</option>
                <option value="youtube">🎬 YouTube</option>
                <option value="tiktok">🎵 TikTok</option>
                <option value="instagram">📸 Instagram</option>
                <option value="facebook">📘 Facebook</option>
                <option value="twitter">🐦 Twitter/X</option>
                <option value="vimeo">🎥 Vimeo</option>
                <option value="twitch">🟣 Twitch</option>
            </select>
            
            <select id="quality">
                <option value="best">🎚️ Best Quality</option>
                <option value="1080">1080p HD</option>
                <option value="720">720p HD</option>
                <option value="480">480p</option>
                <option value="360">360p</option>
            </select>
            
            <button id="downloadBtn" class="download-btn">⬇️ DOWNLOAD VIDEO NOW</button>
            
            <div class="progress" id="progress">
                <div class="progress-bar" id="progressBar"></div>
            </div>
            
            <div id="result" class="result"></div>
        </div>
    </div>

    <script>
        const downloadBtn = document.getElementById('downloadBtn');
        const videoUrlInput = document.getElementById('videoUrl');
        const siteTypeSelect = document.getElementById('siteType');
        const qualitySelect = document.getElementById('quality');
        const resultDiv = document.getElementById('result');
        const progress = document.getElementById('progress');
        const progressBar = document.getElementById('progressBar');
        
        async function downloadVideo() {
            const url = videoUrlInput.value.trim();
            
            if (!url) {
                showResult('❌ Please paste a video URL first!', 'error');
                return;
            }
            
            // Show loading
            downloadBtn.disabled = true;
            downloadBtn.textContent = '⏳ Downloading...';
            progress.style.display = 'block';
            progressBar.style.width = '10%';
            
            try {
                // Show progress
                showResult('🔍 Processing video...', 'success');
                progressBar.style.width = '30%';
                
                // Send to server
                const response = await fetch('/api/download', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        url: url,
                        siteType: siteTypeSelect.value,
                        quality: qualitySelect.value
                    })
                });
                
                progressBar.style.width = '60%';
                
                const data = await response.json();
                
                if (data.success) {
                    progressBar.style.width = '90%';
                    
                    // Show success
                    showResult(
                        '✅ <strong>Video downloaded successfully!</strong><br><br>' +
                        '📁 <strong>File:</strong> ' + data.filename + '<br>' +
                        '🎬 <strong>Title:</strong> ' + data.title + '<br>' +
                        '🎚️ <strong>Quality:</strong> ' + data.quality + '<br>' +
                        '💾 <strong>Size:</strong> ' + formatBytes(data.size) + '<br><br>' +
                        '⬇️ <a href="' + data.downloadUrl + '" style="color:#FF0000; font-weight:bold;">Click here if download doesn\'t start automatically</a>',
                        'success'
                    );
                    
                    progressBar.style.width = '100%';
                    
                    // Auto-start download
                    setTimeout(() => {
                        window.location.href = data.downloadUrl;
                    }, 1000);
                    
                } else {
                    throw new Error(data.error || 'Download failed');
                }
                
            } catch (error) {
                showResult('❌ Error: ' + error.message, 'error');
            } finally {
                // Reset after 5 seconds
                setTimeout(() => {
                    downloadBtn.disabled = false;
                    downloadBtn.textContent = '⬇️ DOWNLOAD VIDEO NOW';
                    progress.style.display = 'none';
                    progressBar.style.width = '0%';
                }, 5000);
            }
        }
        
        function showResult(message, type) {
            resultDiv.innerHTML = message;
            resultDiv.className = 'result ' + type;
            resultDiv.style.display = 'block';
        }
        
        function formatBytes(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        // Event listeners
        downloadBtn.addEventListener('click', downloadVideo);
        videoUrlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') downloadVideo();
        });
        
        // Auto-detect on paste
        videoUrlInput.addEventListener('paste', () => {
            setTimeout(() => {
                const url = videoUrlInput.value.toLowerCase();
                if (url.includes('youtube')) siteTypeSelect.value = 'youtube';
                else if (url.includes('tiktok')) siteTypeSelect.value = 'tiktok';
                else if (url.includes('instagram')) siteTypeSelect.value = 'instagram';
                else if (url.includes('facebook')) siteTypeSelect.value = 'facebook';
                else if (url.includes('twitter') || url.includes('x.com')) siteTypeSelect.value = 'twitter';
                else if (url.includes('vimeo')) siteTypeSelect.value = 'vimeo';
                else if (url.includes('twitch')) siteTypeSelect.value = 'twitch';
            }, 100);
        });
        
        console.log('🎬 GrabAnyVideo ready!');
    </script>
</body>
</html>`;
    
    res.send(html);
});

// === HEALTH CHECK ===
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'GrabAnyVideo - Real Video Downloader',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        features: ['real_downloads', 'no_3rd_party', 'all_sites', 'direct_download'],
        supported_sites: ['YouTube', 'TikTok', 'Instagram', 'Facebook', 'Twitter', 'Vimeo', 'Twitch', 'Dailymotion', 'Reddit', 'LinkedIn', 'Zoom']
    });
});

// === START SERVER ===
app.listen(PORT, () => {
    console.log(`
    =========================================
    🎬 GRABANYVIDEO REAL DOWNLOADER v2.0
    📍 Port: ${PORT}
    🌐 URL: https://youtube-downloader-lmti.onrender.com
    =========================================
    ✅ REAL downloads - No 3rd party!
    ✅ All sites supported
    ✅ Direct to device
    ✅ Quality selection
    =========================================
    `);
});