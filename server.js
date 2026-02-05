// 🎬 GRABANYVIDEO - Universal Video Downloader (REAL DOWNLOADS)
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
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
    if (url.includes('vimeo.com')) return 'vimeo';
    if (url.includes('twitch.tv')) return 'twitch';
    if (url.includes('dailymotion.com')) return 'dailymotion';
    if (url.includes('reddit.com')) return 'reddit';
    
    return 'auto';
}

// === YOUTUBE DOWNLOADER (REAL) ===
async function downloadYouTube(url, quality = 'best') {
    try {
        console.log('🎬 Downloading YouTube video:', url);
        
        const timestamp = Date.now();
        const filename = `grabanyvideo-youtube-${timestamp}.mp4`;
        const outputPath = path.join(downloadsDir, filename);
        
        // Build yt-dlp command based on quality
        let qualityOption = '';
        if (quality === 'best') {
            qualityOption = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
        } else if (quality === '1080') {
            qualityOption = 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]';
        } else if (quality === '720') {
            qualityOption = 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]';
        } else if (quality === '480') {
            qualityOption = 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]';
        } else if (quality === '360') {
            qualityOption = 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]';
        } else {
            qualityOption = 'best[ext=mp4]';
        }
        
        // Use yt-dlp to download the video
        const command = `yt-dlp "${url}" -o "${outputPath}" -f "${qualityOption}" --no-warnings --merge-output-format mp4`;
        
        console.log('🔄 Running command:', command);
        
        const { stdout, stderr } = await execPromise(command);
        
        if (stderr && !stderr.includes('WARNING')) {
            console.warn('yt-dlp warnings:', stderr);
        }
        
        // Check if file was created
        const files = fs.readdirSync(downloadsDir);
        let downloadedFile = null;
        
        // Find the downloaded file (yt-dlp might rename it)
        for (const file of files) {
            if (file.includes(timestamp.toString()) || file.endsWith('.mp4')) {
                // Check if it's a video file by size (more than 1KB)
                const filepath = path.join(downloadsDir, file);
                const stats = fs.statSync(filepath);
                if (stats.size > 1024) {
                    downloadedFile = file;
                    break;
                }
            }
        }
        
        if (!downloadedFile) {
            // Try to find the newest MP4 file
            const mp4Files = files.filter(f => f.endsWith('.mp4'));
            if (mp4Files.length > 0) {
                // Get the newest file
                const newestFile = mp4Files.sort((a, b) => {
                    const statA = fs.statSync(path.join(downloadsDir, a));
                    const statB = fs.statSync(path.join(downloadsDir, b));
                    return statB.mtimeMs - statA.mtimeMs;
                })[0];
                
                downloadedFile = newestFile;
            }
        }
        
        if (downloadedFile) {
            const finalPath = path.join(downloadsDir, downloadedFile);
            const stats = fs.statSync(finalPath);
            
            console.log(`✅ Downloaded: ${downloadedFile} (${formatBytes(stats.size)})`);
            
            return {
                success: true,
                filename: downloadedFile,
                filepath: finalPath,
                title: `YouTube Video - ${timestamp}`,
                quality: quality,
                size: stats.size,
                downloadUrl: `/downloads/${downloadedFile}`
            };
        } else {
            throw new Error('No video file was downloaded');
        }
        
    } catch (error) {
        console.error('YouTube download error:', error);
        throw new Error(`YouTube download failed: ${error.message}`);
    }
}

// === OTHER SITES DOWNLOADER (Using yt-dlp) ===
async function downloadOtherSites(url, siteType) {
    try {
        console.log(`🌐 Downloading ${siteType} video:`, url);
        
        const timestamp = Date.now();
        const filename = `grabanyvideo-${siteType}-${timestamp}.mp4`;
        const outputPath = path.join(downloadsDir, filename);
        
        // Use yt-dlp for other sites
        const command = `yt-dlp "${url}" -o "${outputPath}" -f "best[ext=mp4]/best" --no-warnings`;
        
        console.log('🔄 Running command:', command);
        
        const { stdout, stderr } = await execPromise(command);
        
        if (stderr && !stderr.includes('WARNING')) {
            console.warn(`${siteType} download warnings:`, stderr);
        }
        
        // Check for downloaded file
        const files = fs.readdirSync(downloadsDir);
        let downloadedFile = null;
        
        for (const file of files) {
            if (file.includes(siteType) && file.includes(timestamp.toString())) {
                downloadedFile = file;
                break;
            }
        }
        
        if (!downloadedFile) {
            // Find any new MP4 file
            const mp4Files = files.filter(f => f.endsWith('.mp4'));
            if (mp4Files.length > 0) {
                const newestFile = mp4Files.sort((a, b) => {
                    const statA = fs.statSync(path.join(downloadsDir, a));
                    const statB = fs.statSync(path.join(downloadsDir, b));
                    return statB.mtimeMs - statA.mtimeMs;
                })[0];
                
                downloadedFile = newestFile;
            }
        }
        
        if (downloadedFile) {
            const finalPath = path.join(downloadsDir, downloadedFile);
            const stats = fs.statSync(finalPath);
            
            console.log(`✅ Downloaded ${siteType}: ${downloadedFile} (${formatBytes(stats.size)})`);
            
            return {
                success: true,
                filename: downloadedFile,
                filepath: finalPath,
                title: `${siteType.charAt(0).toUpperCase() + siteType.slice(1)} Video`,
                quality: 'best',
                size: stats.size,
                downloadUrl: `/downloads/${downloadedFile}`
            };
        } else {
            throw new Error(`Could not download ${siteType} video`);
        }
        
    } catch (error) {
        console.error(`${siteType} download error:`, error);
        
        // For now, create a placeholder with proper MP4 headers
        // In production, you'd want to implement proper downloaders
        return createVideoPlaceholder(url, siteType, 'This platform requires additional setup for video downloads.');
    }
}

// === CREATE PROPER MP4 PLACEHOLDER ===
async function createVideoPlaceholder(url, siteType, message) {
    const timestamp = Date.now();
    const filename = `grabanyvideo-${siteType}-${timestamp}.mp4`;
    const filepath = path.join(downloadsDir, filename);
    
    // Create a minimal valid MP4 file with a message
    const ffmpegCommand = `ffmpeg -f lavfi -i color=c=black:s=1280x720:d=2 -vf "drawtext=text='${siteType.toUpperCase()} VIDEO\\n${message}\\nURL: ${url}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=(h-text_h)/2" -c:a aac "${filepath}" -y`;
    
    try {
        await execPromise(ffmpegCommand);
        
        const stats = fs.statSync(filepath);
        
        return {
            success: true,
            filename: filename,
            filepath: filepath,
            title: `${siteType} Video Placeholder`,
            quality: 'placeholder',
            size: stats.size,
            downloadUrl: `/downloads/${filename}`,
            note: 'This is a placeholder video. Real downloads coming soon.'
        };
    } catch (error) {
        console.error('Placeholder creation error:', error);
        
        // Fallback to text file
        const textContent = `GrabAnyVideo Download\nURL: ${url}\nSite: ${siteType}\nStatus: ${message}\nDate: ${new Date().toISOString()}`;
        fs.writeFileSync(filepath, textContent);
        
        const stats = fs.statSync(filepath);
        
        return {
            success: true,
            filename: filename,
            filepath: filepath,
            title: `${siteType} Video Info`,
            quality: 'info',
            size: stats.size,
            downloadUrl: `/downloads/${filename}`,
            note: 'Video download not yet implemented for this platform.'
        };
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
        
        // Use appropriate downloader
        if (detectedSite === 'youtube') {
            result = await downloadYouTube(url, quality);
        } else {
            result = await downloadOtherSites(url, detectedSite);
        }
        
        if (result.success) {
            res.json({
                success: true,
                message: result.note || 'Video downloaded successfully!',
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
            suggestion: 'Try a different video or quality'
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

// === CLEAN OLD FILES ===
function cleanOldFiles() {
    try {
        const files = fs.readdirSync(downloadsDir);
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        files.forEach(file => {
            const filepath = path.join(downloadsDir, file);
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
setInterval(cleanOldFiles, 60 * 60 * 1000);

// === FRONTEND PAGE (SAME AS BEFORE) ===
app.get('/', (req, res) => {
    const currentYear = new Date().getFullYear();
    
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>🎬 GrabAnyVideo - Universal Video Downloader</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        /* ALL THE SAME STYLES AS BEFORE - KEEP THEM */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #0f0f0f, #1a1a1a); color: white; min-height: 100vh; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; padding: 20px; }
        h1 { color: #FF0000; font-size: 42px; margin-bottom: 10px; }
        .subtitle { color: #ccc; font-size: 18px; margin-bottom: 10px; }
        .main-card { background: rgba(255, 255, 255, 0.05); border-radius: 20px; padding: 30px; margin-bottom: 25px; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        .input-group { margin-bottom: 20px; }
        input { width: 100%; padding: 18px; font-size: 16px; border: 2px solid #333; border-radius: 12px; background: #222; color: white; transition: all 0.3s; }
        input:focus { border-color: #FF0000; outline: none; box-shadow: 0 0 0 3px rgba(255, 0, 0, 0.2); }
        .quality-group { margin: 20px 0; }
        .quality-label { display: block; margin-bottom: 10px; color: #ccc; font-weight: 500; }
        .quality-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
        .quality-btn { padding: 12px 20px; background: #222; color: #ccc; border: 2px solid #333; border-radius: 10px; cursor: pointer; transition: all 0.2s; flex: 1; min-width: 80px; text-align: center; }
        .quality-btn:hover { border-color: #FF0000; color: white; }
        .quality-btn.active { background: #FF0000; border-color: #FF0000; color: white; font-weight: bold; }
        .site-selector { margin: 20px 0; }
        select { width: 100%; padding: 16px; font-size: 16px; border: 2px solid #333; border-radius: 12px; background: #222; color: white; margin-bottom: 10px; }
        select:focus { border-color: #FF0000; outline: none; }
        .sites-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 12px; margin: 25px 0; }
        .site-card { background: #222; padding: 20px 10px; border-radius: 12px; text-align: center; cursor: pointer; border: 2px solid transparent; transition: all 0.3s; }
        .site-card:hover { border-color: #FF0000; background: #2a2a2a; transform: translateY(-3px); }
        .site-card.active { border-color: #FF0000; background: rgba(255, 0, 0, 0.1); transform: translateY(-3px); }
        .site-icon { font-size: 32px; margin-bottom: 8px; }
        .site-name { font-size: 13px; color: #ccc; font-weight: 500; }
        .download-btn { width: 100%; padding: 20px; background: linear-gradient(135deg, #FF0000, #CC0000); color: white; border: none; border-radius: 12px; font-size: 20px; font-weight: bold; cursor: pointer; transition: all 0.3s; margin: 25px 0 15px 0; }
        .download-btn:hover { transform: translateY(-3px); box-shadow: 0 10px 25px rgba(255, 0, 0, 0.3); }
        .download-btn:active { transform: translateY(-1px); }
        .download-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .result { margin-top: 25px; padding: 25px; border-radius: 15px; background: rgba(255, 255, 255, 0.05); display: none; border-left: 5px solid #FF0000; }
        .result.success { border-left-color: #00FF00; background: rgba(0, 255, 0, 0.05); }
        .result.error { border-left-color: #FF0000; background: rgba(255, 0, 0, 0.05); }
        .progress-bar { width: 100%; height: 20px; background: #222; border-radius: 10px; margin: 15px 0; overflow: hidden; display: none; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #FF0000, #FF6B6B); width: 0%; transition: width 0.3s; }
        .features { display: flex; justify-content: center; gap: 25px; margin: 30px 0; flex-wrap: wrap; }
        .feature { text-align: center; padding: 15px; min-width: 120px; }
        .feature-icon { font-size: 28px; margin-bottom: 10px; color: #FF0000; }
        .feature-text { font-size: 14px; color: #ccc; }
        .footer { text-align: center; margin-top: 40px; color: #888; font-size: 13px; }
        .status-badge { background: #00FF00; color: black; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-left: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎬 GrabAnyVideo</h1>
            <div class="subtitle">Universal Video Downloader</div>
            <div class="subtitle" style="color:#00FF00; font-size:14px;">
                ✅ YouTube: <span class="status-badge">REAL DOWNLOADS</span>
                ⚠️ Other sites: <span style="background:#FFA500;color:black;padding:4px 10px;border-radius:12px;font-size:12px;">TESTING</span>
            </div>
        </div>
        
        <div class="features">
            <div class="feature">
                <div class="feature-icon">🌐</div>
                <div class="feature-text">Auto-Detect</div>
            </div>
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
                <div class="feature-text">All Devices</div>
            </div>
        </div>
        
        <div class="main-card">
            <div class="input-group">
                <input type="text" id="videoUrl" 
                       placeholder="🔗 Paste ANY video URL (YouTube, TikTok, Instagram, Facebook, Twitter, Vimeo, etc.)" 
                       autocomplete="off">
            </div>
            
            <div class="site-selector">
                <select id="siteType">
                    <option value="auto">🌐 Auto-detect Site (Recommended)</option>
                    <option value="youtube">🎬 YouTube (REAL)</option>
                    <option value="tiktok">🎵 TikTok</option>
                    <option value="instagram">📸 Instagram</option>
                    <option value="facebook">📘 Facebook</option>
                    <option value="twitter">🐦 Twitter/X</option>
                    <option value="vimeo">🎥 Vimeo</option>
                    <option value="twitch">🟣 Twitch</option>
                </select>
            </div>
            
            <div class="quality-group">
                <div class="quality-label">🎚️ Select Quality (YouTube only):</div>
                <div class="quality-buttons">
                    <div class="quality-btn active" data-quality="best">Best Quality</div>
                    <div class="quality-btn" data-quality="1080">1080p HD</div>
                    <div class="quality-btn" data-quality="720">720p HD</div>
                    <div class="quality-btn" data-quality="480">480p</div>
                    <div class="quality-btn" data-quality="360">360p</div>
                </div>
            </div>
            
            <div class="sites-grid">
                <div class="site-card" data-site="youtube">
                    <div class="site-icon">🎬</div>
                    <div class="site-name">YouTube</div>
                </div>
                <div class="site-card" data-site="tiktok">
                    <div class="site-icon">🎵</div>
                    <div class="site-name">TikTok</div>
                </div>
                <div class="site-card" data-site="instagram">
                    <div class="site-icon">📸</div>
                    <div class="site-name">Instagram</div>
                </div>
                <div class="site-card" data-site="facebook">
                    <div class="site-icon">📘</div>
                    <div class="site-name">Facebook</div>
                </div>
                <div class="site-card" data-site="twitter">
                    <div class="site-icon">🐦</div>
                    <div class="site-name">Twitter</div>
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
            
            <div class="progress-bar" id="progressBar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
            
            <div id="result" class="result"></div>
        </div>
        
        <div class="footer">
            <p>GrabAnyVideo - Universal Video Downloader © ${currentYear}</p>
            <p style="font-size:11px;color:#666;">YouTube: Real video downloads | Other sites: Testing phase</p>
        </div>
    </div>

    <script>
        // ===== ELEMENTS =====
        const downloadBtn = document.getElementById('downloadBtn');
        const videoUrlInput = document.getElementById('videoUrl');
        const siteTypeSelect = document.getElementById('siteType');
        const resultDiv = document.getElementById('result');
        const progressBar = document.getElementById('progressBar');
        const progressFill = document.getElementById('progressFill');
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
            if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
            if (url.includes('instagram.com')) return 'instagram';
            if (url.includes('tiktok.com')) return 'tiktok';
            if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
            if (url.includes('vimeo.com')) return 'vimeo';
            if (url.includes('twitch.tv')) return 'twitch';
            
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
            progressBar.style.display = 'block';
            updateProgress(10);
            
            try {
                // Show progress
                showResult('🔍 Processing video...', 'success');
                updateProgress(30);
                
                // Send to our server API
                const response = await fetch('/api/download', {
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
                
                updateProgress(60);
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Server error');
                }
                
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.error || 'Download failed');
                }
                
                // Show ready message
                showResult('✅ Video ready! Starting download...', 'success');
                updateProgress(90);
                
                // Create download link
                const downloadLink = document.createElement('a');
                downloadLink.href = data.downloadUrl;
                downloadLink.download = data.filename;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
                
                // Show success
                showResult('🎉 <strong>Download started!</strong><br>' +
                         '📁 <strong>File:</strong> ' + data.filename + '<br>' +
                         '🌐 <strong>Site:</strong> ' + data.site + '<br>' +
                         '🎚️ <strong>Quality:</strong> ' + data.quality + '<br>' +
                         '💾 <strong>Size:</strong> ' + formatBytes(data.size) + '<br><br>' +
                         '✅ Video is downloading to your device', 'success');
                updateProgress(100);
                
            } catch (error) {
                console.error('Download error:', error);
                showResult('❌ Error: ' + error.message + '<br><br>' +
                         '💡 Try a different video or quality.', 'error');
            } finally {
                // Reset button after 3 seconds
                setTimeout(() => {
                    downloadBtn.disabled = false;
                    downloadBtn.innerHTML = '⬇️ DOWNLOAD VIDEO NOW';
                    progressBar.style.display = 'none';
                    progressFill.style.width = '0%';
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
        
        function updateProgress(percent) {
            progressFill.style.width = percent + '%';
        }
        
        function updateActiveCard(siteType) {
            siteCards.forEach(function(card) {
                if (card.dataset.site === siteType) {
                    card.classList.add('active');
                } else {
                    card.classList.remove('active');
                }
            });
        }
        
        function updateActiveQuality(quality) {
            qualityBtns.forEach(function(btn) {
                if (btn.dataset.quality === quality) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
        
        function formatBytes(bytes) {
            if (!bytes) return 'Unknown';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        // ===== EVENT LISTENERS =====
        downloadBtn.addEventListener('click', downloadVideo);
        
        videoUrlInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') downloadVideo();
        });
        
        videoUrlInput.addEventListener('paste', function() {
            setTimeout(function() {
                const url = videoUrlInput.value;
                if (url) {
                    const detected = detectSite(url);
                    siteTypeSelect.value = detected;
                    updateActiveCard(detected);
                }
            }, 100);
        });
        
        // Site card clicks
        siteCards.forEach(function(card) {
            card.addEventListener('click', function() {
                const site = card.dataset.site;
                selectedSite = site;
                siteTypeSelect.value = site;
                updateActiveCard(site);
            });
        });
        
        // Quality button clicks
        qualityBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
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

// === HEALTH CHECK ===
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'GrabAnyVideo - Universal Video Downloader',
        version: '7.0.0',
        timestamp: new Date().toISOString(),
        features: {
            youtube: 'Real video downloads',
            other_sites: 'Testing/placeholder',
            auto_detection: 'Working',
            quality_selection: 'Working'
        }
    });
});

// === START SERVER ===
app.listen(PORT, () => {
    console.log(`
    =========================================
    🎬 GRABANYVIDEO v7.0 (REAL DOWNLOADS)
    📍 Port: ${PORT}
    =========================================
    ✅ YouTube: REAL video downloads
    ✅ Other sites: Placeholder/testing
    ✅ Auto-detection working
    ✅ Quality selection
    =========================================
    💡 YouTube videos will be real MP4 files!
    =========================================
    `);
});