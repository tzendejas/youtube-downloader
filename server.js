// 🎬 GRABANYVIDEO - Universal Video Downloader (FIXED IMPORTS)
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// CORRECT IMPORTS - FIXED!
const ytdl = require('@distube/ytdl-core');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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

// === UNIVERSAL DOWNLOADER (using yt-dlp CLI) ===
async function downloadUniversal(url, siteType = 'auto') {
    return new Promise(async (resolve, reject) => {
        try {
            console.log(`🌐 Downloading ${siteType} video with yt-dlp:`, url);
            
            const timestamp = Date.now();
            const baseFilename = `grabanyvideo-${siteType}-${timestamp}`;
            const outputTemplate = path.join(downloadsDir, `${baseFilename}.%(ext)s`);
            
            // Build yt-dlp command
            const command = `yt-dlp "${url}" -o "${outputTemplate}" -f "best[ext=mp4]/best" --no-warnings --no-check-certificate`;
            
            console.log('🔄 Running command:', command);
            
            // Execute yt-dlp
            const { stdout, stderr } = await execPromise(command);
            
            if (stderr && !stderr.includes('WARNING')) {
                console.warn('yt-dlp stderr:', stderr);
            }
            
            // Find the downloaded file
            const files = fs.readdirSync(downloadsDir);
            const downloadedFile = files.find(f => 
                f.includes(baseFilename) || 
                f.includes(siteType) && f.includes(timestamp.toString())
            );
            
            if (downloadedFile) {
                const filepath = path.join(downloadsDir, downloadedFile);
                const stats = fs.statSync(filepath);
                
                console.log(`✅ Downloaded: ${downloadedFile} (${formatBytes(stats.size)})`);
                
                resolve({
                    success: true,
                    filename: downloadedFile,
                    filepath: filepath,
                    title: `${siteType.charAt(0).toUpperCase() + siteType.slice(1)} Video`,
                    quality: 'best',
                    size: stats.size,
                    downloadUrl: `/downloads/${downloadedFile}`
                });
            } else {
                // Try to find newest file
                const videoFiles = files.filter(f => 
                    f.endsWith('.mp4') || f.endsWith('.mkv') || f.endsWith('.webm')
                );
                
                if (videoFiles.length > 0) {
                    const newestFile = videoFiles.sort((a, b) => {
                        const statA = fs.statSync(path.join(downloadsDir, a));
                        const statB = fs.statSync(path.join(downloadsDir, b));
                        return statB.mtimeMs - statA.mtimeMs;
                    })[0];
                    
                    const filepath = path.join(downloadsDir, newestFile);
                    const stats = fs.statSync(filepath);
                    
                    resolve({
                        success: true,
                        filename: newestFile,
                        filepath: filepath,
                        title: `${siteType} Video`,
                        quality: 'best',
                        size: stats.size,
                        downloadUrl: `/downloads/${newestFile}`
                    });
                } else {
                    throw new Error('No video file found after download');
                }
            }
            
        } catch (error) {
            console.error(`${siteType} download error:`, error);
            
            // Try alternative method for specific sites
            if (siteType === 'tiktok' || siteType === 'instagram') {
                try {
                    console.log('🔄 Trying alternative download method...');
                    const result = await downloadWithAxios(url, siteType);
                    resolve(result);
                } catch (altError) {
                    reject(new Error(`Failed to download ${siteType} video: ${altError.message}`));
                }
            } else {
                reject(new Error(`Failed to download ${siteType} video: ${error.message}`));
            }
        }
    });
}

// === ALTERNATIVE DOWNLOADER (for sites that block yt-dlp) ===
async function downloadWithAxios(url, siteType) {
    try {
        console.log(`📥 Downloading ${siteType} via direct URL...`);
        
        // This is a simplified version - in production you'd need site-specific logic
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });
        
        // Extract video URL from page (simplified)
        const html = response.data;
        let videoUrl = null;
        
        // Simple URL extraction (would need to be improved for production)
        const videoRegex = /(https?:\/\/[^"']*\.(mp4|webm|m3u8)[^"']*)/i;
        const match = html.match(videoRegex);
        if (match) {
            videoUrl = match[1];
        }
        
        if (!videoUrl) {
            throw new Error('Could not find video URL in page');
        }
        
        const filename = `grabanyvideo-${siteType}-${Date.now()}.mp4`;
        const filepath = path.join(downloadsDir, filename);
        
        const videoResponse = await axios({
            method: 'GET',
            url: videoUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': url
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
                    title: `${siteType} Video`,
                    quality: 'best',
                    size: stats.size,
                    downloadUrl: `/downloads/${filename}`
                });
            });
            writer.on('error', reject);
        });
        
    } catch (error) {
        console.error(`Axios download error for ${siteType}:`, error);
        throw error;
    }
}

// === HELPER FUNCTION ===
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        
        if (result.success) {
            // Return download information
            res.json({
                success: true,
                message: 'Video downloaded successfully!',
                downloadUrl: result.downloadUrl,
                filename: result.filename,
                title: result.title,
                quality: result.quality,
                size: result.size,
                site: detectedSite,
                directDownload: true
            });
        } else {
            throw new Error('Download failed');
        }
        
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            suggestion: 'Try a different quality or check the URL'
        });
    }
});

// === DIRECT DOWNLOAD ENDPOINT ===
app.get('/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(downloadsDir, filename);
    
    if (fs.existsSync(filepath)) {
        // Force download
        res.download(filepath, filename, (err) => {
            if (err) {
                console.error('Download error:', err);
                if (!res.headersSent) {
                    res.status(500).send('Error downloading file');
                }
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
        .tagline {
            color: #888;
            font-size: 14px;
            margin-bottom: 20px;
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
        .progress-bar {
            width: 100%;
            height: 20px;
            background: #222;
            border-radius: 10px;
            margin: 15px 0;
            overflow: hidden;
            display: none;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #FF0000, #FF6B6B);
            width: 0%;
            transition: width 0.3s;
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
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎬 GrabAnyVideo</h1>
            <div class="subtitle">REAL Video Downloader - No Third Party</div>
            <div class="tagline">Direct downloads from our server</div>
        </div>
        
        <div class="main-card">
            <div class="input-group">
                <input type="text" id="videoUrl" 
                       placeholder="🔗 Paste ANY video URL (YouTube, TikTok, Instagram, Facebook, etc.)" 
                       autocomplete="off">
            </div>
            
            <div class="site-selector">
                <select id="siteType">
                    <option value="auto">🌐 Auto-detect Site</option>
                    <option value="youtube">🎬 YouTube</option>
                    <option value="tiktok">🎵 TikTok</option>
                    <option value="instagram">📸 Instagram</option>
                    <option value="facebook">📘 Facebook</option>
                    <option value="twitter">🐦 Twitter/X</option>
                    <option value="vimeo">🎥 Vimeo</option>
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
            
            <button id="downloadBtn" class="download-btn">⬇️ DOWNLOAD VIDEO NOW</button>
            
            <div class="progress-bar" id="progressBar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
            
            <div id="result" class="result"></div>
        </div>
        
        <div class="instructions">
            <strong>✅ Features:</strong><br>
            • Direct downloads (no 3rd party)<br>
            • All major video sites supported<br>
            • Quality selection for YouTube<br>
            • Fast and secure<br><br>
            
            <strong>⚠️ Note:</strong> First download may take 30-60 seconds as server initializes.
        </div>
        
        <div class="footer">
            <p>GrabAnyVideo - Direct video downloads from our server</p>
        </div>
    </div>

    <script>
        const downloadBtn = document.getElementById('downloadBtn');
        const videoUrlInput = document.getElementById('videoUrl');
        const siteTypeSelect = document.getElementById('siteType');
        const resultDiv = document.getElementById('result');
        const progressBar = document.getElementById('progressBar');
        const progressFill = document.getElementById('progressFill');
        const qualityBtns = document.querySelectorAll('.quality-btn');
        
        let selectedQuality = 'best';
        
        function detectSite(url) {
            if (!url) return 'auto';
            url = url.toLowerCase();
            if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
            if (url.includes('tiktok.com')) return 'tiktok';
            if (url.includes('instagram.com')) return 'instagram';
            if (url.includes('facebook.com')) return 'facebook';
            if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
            return 'auto';
        }
        
        async function downloadVideo() {
            const url = videoUrlInput.value.trim();
            
            if (!url) {
                showResult('❌ Please paste a video URL', 'error');
                return;
            }
            
            let siteType = siteTypeSelect.value;
            if (siteType === 'auto') {
                siteType = detectSite(url);
                siteTypeSelect.value = siteType;
            }
            
            // Show loading
            downloadBtn.disabled = true;
            downloadBtn.innerHTML = '⏳ Processing...';
            progressBar.style.display = 'block';
            updateProgress(10);
            showResult('🔍 Processing video...', 'success');
            
            try {
                updateProgress(30);
                
                const response = await fetch('/api/download', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: url,
                        siteType: siteType,
                        quality: selectedQuality
                    })
                });
                
                updateProgress(60);
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Server error');
                }
                
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.error || 'Download failed');
                }
                
                updateProgress(90);
                showResult('✅ Video ready! Starting download...', 'success');
                
                // Start download
                setTimeout(() => {
                    window.location.href = data.downloadUrl;
                }, 1000);
                
                showResult(
                    '🎉 <strong>Download started!</strong><br>' +
                    '📁 <strong>File:</strong> ' + data.filename + '<br>' +
                    '🎬 <strong>Site:</strong> ' + data.site + '<br>' +
                    '🎚️ <strong>Quality:</strong> ' + data.quality + '<br>' +
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
                    downloadBtn.innerHTML = '⬇️ DOWNLOAD VIDEO NOW';
                    progressBar.style.display = 'none';
                    progressFill.style.width = '0%';
                }, 5000);
            }
        }
        
        function showResult(message, type) {
            resultDiv.innerHTML = message;
            resultDiv.className = 'result ' + type;
            resultDiv.style.display = 'block';
        }
        
        function updateProgress(percent) {
            progressFill.style.width = percent + '%';
        }
        
        qualityBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                selectedQuality = btn.dataset.quality;
                qualityBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
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
                }
            }, 100);
        });
        
        videoUrlInput.focus();
    </script>
</body>
</html>`;
    
    res.send(html);
});

// === HEALTH CHECK ===
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'GrabAnyVideo - Fixed Version',
        version: '3.0.0',
        timestamp: new Date().toISOString(),
        downloadsDir: downloadsDir,
        supported_sites: ['YouTube', 'TikTok', 'Instagram', 'Facebook', 'Twitter', 'Vimeo', 'Twitch']
    });
});

// === START SERVER ===
app.listen(PORT, () => {
    console.log(`
    =========================================
    🎬 GRABANYVIDEO v3.0 (FIXED)
    📍 Port: ${PORT}
    =========================================
    ✅ Fixed imports
    ✅ Using yt-dlp CLI (works on Render)
    ✅ Direct downloads
    =========================================
    `);
});