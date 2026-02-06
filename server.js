// 🎬 GRABANYVIDEO - COMPLETE WORKING VERSION 2026
const express = require('express');
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

// === CONFIGURATION ===
const BIN_DIR = path.join(__dirname, 'bin');
const YTDLP_PATH = path.join(BIN_DIR, 'yt-dlp');

// Create directories
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

app.use('/downloads', express.static(downloadsDir));

// === SITE DETECTION ===
function detectSite(url) {
    if (!url) return 'auto';
    
    url = url.toLowerCase();
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('facebook.com') || url.includes('fb.watch')) return 'facebook';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
    if (url.includes('vimeo.com')) return 'vimeo';
    if (url.includes('twitch.tv')) return 'twitch';
    if (url.includes('dailymotion.com')) return 'dailymotion';
    if (url.includes('reddit.com')) return 'reddit';
    if (url.includes('linkedin.com')) return 'linkedin';
    if (url.includes('zoom.us') || url.includes('meet.google.com')) return 'zoom';
    if (url.includes('rumble.com')) return 'rumble';
    if (url.includes('bitchute.com')) return 'bitchute';
    if (url.includes('odysee.com')) return 'odysee';
    
    return 'auto';
}

// === ENHANCED DOWNLOADER ===
async function downloadVideo(url, quality = 'best') {
    try {
        console.log(`🎬 Processing: ${url}`);
        
        const timestamp = Date.now();
        const outputPath = path.join(downloadsDir, `video-${timestamp}.mp4`);
        const siteType = detectSite(url);
        
        // Build command
        let command = `"${YTDLP_PATH}" "${url}" -o "${outputPath}"`;
        
        // === YOUTUBE HANDLING ===
        if (siteType === 'youtube') {
            console.log('🎬 YouTube - Trying different methods...');
            
            let lastError = null;
            
            // Method 1: Android client
            try {
                let ytCmd = `"${YTDLP_PATH}" "${url}" -o "${outputPath}"`;
                ytCmd += ' -f "best[height<=720]"';
                ytCmd += ' --extractor-args "youtube:player_client=android"';
                ytCmd += ' --user-agent "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36"';
                ytCmd += ' --referer "https://www.youtube.com/"';
                ytCmd += ' --no-warnings --no-check-certificate --geo-bypass';
                ytCmd += ' --merge-output-format mp4 --ignore-errors';
                
                console.log('🔄 Method 1: Android client');
                await execPromise(ytCmd, { timeout: 120000 });
                
                if (fs.existsSync(outputPath)) {
                    return createSuccessResponse(outputPath, timestamp, 'youtube');
                }
            } catch (err1) {
                lastError = err1;
                console.log('⚠️ Method 1 failed');
            }
            
            // Method 2: Web client
            try {
                let ytCmd = `"${YTDLP_PATH}" "${url}" -o "${outputPath}"`;
                ytCmd += ' -f "best"';
                ytCmd += ' --extractor-args "youtube:player_client=web"';
                ytCmd += ' --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"';
                ytCmd += ' --referer "https://www.youtube.com/"';
                ytCmd += ' --no-warnings --no-check-certificate --geo-bypass';
                ytCmd += ' --merge-output-format mp4 --ignore-errors';
                
                console.log('🔄 Method 2: Web client');
                await execPromise(ytCmd, { timeout: 120000 });
                
                if (fs.existsSync(outputPath)) {
                    return createSuccessResponse(outputPath, timestamp, 'youtube');
                }
            } catch (err2) {
                lastError = err2;
                console.log('⚠️ Method 2 failed');
            }
            
            // Method 3: Embed URL (bypass some restrictions)
            try {
                const videoId = url.includes('v=') ? url.split('v=')[1].split('&')[0] : 
                               url.includes('youtu.be/') ? url.split('youtu.be/')[1].split('?')[0] : null;
                
                if (videoId) {
                    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
                    let ytCmd = `"${YTDLP_PATH}" "${embedUrl}" -o "${outputPath}"`;
                    ytCmd += ' -f "best"';
                    ytCmd += ' --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"';
                    ytCmd += ' --referer "https://www.youtube.com/"';
                    ytCmd += ' --no-warnings --no-check-certificate --geo-bypass';
                    ytCmd += ' --merge-output-format mp4 --ignore-errors';
                    
                    console.log(`🔄 Method 3: Embed URL (${videoId})`);
                    await execPromise(ytCmd, { timeout: 120000 });
                    
                    if (fs.existsSync(outputPath)) {
                        return createSuccessResponse(outputPath, timestamp, 'youtube');
                    }
                }
            } catch (err3) {
                lastError = err3;
                console.log('⚠️ Method 3 failed');
            }
            
            // All methods failed
            const errorMsg = lastError?.stderr || lastError?.message || 'YouTube download failed';
            
            if (errorMsg.includes('age-restricted') || errorMsg.includes('Sign in')) {
                throw new Error('YouTube: This video requires login or is age-restricted');
            } else if (errorMsg.includes('members-only')) {
                throw new Error('YouTube: This video is for members only');
            } else if (errorMsg.includes('private')) {
                throw new Error('YouTube: This video is private');
            } else if (errorMsg.includes('copyright')) {
                throw new Error('YouTube: This video has copyright restrictions');
            } else if (errorMsg.includes('geo-restricted')) {
                throw new Error('YouTube: This video is not available in your region');
            } else {
                throw new Error('YouTube: Cannot download this video. Try a different one.');
            }
            
        } else {
            // === ALL OTHER SITES ===
            console.log(`🌐 ${siteType.toUpperCase()} - Standard download`);
            
            // Quality selection for non-YouTube
            if (quality === 'best') {
                command += ' -f "best[ext=mp4]/best"';
            } else if (quality === '1080') {
                command += ' -f "best[height<=1080][ext=mp4]/best[height<=1080]"';
            } else if (quality === '720') {
                command += ' -f "best[height<=720][ext=mp4]/best[height<=720]"';
            } else if (quality === '480') {
                command += ' -f "best[height<=480][ext=mp4]/best[height<=480]"';
            }
            
            // Common options for all sites
            command += ' --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"';
            command += ' --no-warnings --no-check-certificate --geo-bypass';
            command += ' --merge-output-format mp4 --ignore-errors';
            
            console.log(`🔄 Executing: ${command.substring(0, 100)}...`);
            
            await execPromise(command, { timeout: 300000 });
            
            if (fs.existsSync(outputPath)) {
                return createSuccessResponse(outputPath, timestamp, siteType);
            } else {
                throw new Error(`Download failed for ${siteType}`);
            }
        }

    } catch (error) {
        console.error('Download Error:', error.message);
        throw error;
    }
}

// Helper function to create success response
function createSuccessResponse(filepath, timestamp, siteType) {
    const stats = fs.statSync(filepath);
    const files = fs.readdirSync(downloadsDir);
    const downloadedFile = files.find(f => f.includes(timestamp.toString()));
    
    return {
        success: true,
        filename: downloadedFile || `video-${timestamp}.mp4`,
        downloadUrl: `/downloads/${downloadedFile || `video-${timestamp}.mp4`}`,
        size: stats.size,
        site: siteType
    };
}

// === API ENDPOINT ===
app.post('/api/download', async (req, res) => {
    try {
        const { url, quality = 'best' } = req.body;
        if (!url) return res.status(400).json({ error: 'No URL provided' });

        const result = await downloadVideo(url, quality);
        
        res.json({
            success: true,
            message: '✅ Download Successful!',
            ...result
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message
        });
    }
});

// === FRONTEND WITH ALL PLATFORMS ===
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🎬 GrabAnyVideo - ALL Platforms</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: sans-serif; background: #111; color: white; padding: 20px; max-width: 900px; margin: 0 auto; }
            .container { max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            h1 { color: #ff0000; font-size: 42px; margin-bottom: 10px; }
            .subtitle { color: #ccc; font-size: 18px; margin-bottom: 30px; }
            .main-card { background: rgba(255,255,255,0.05); padding: 30px; border-radius: 20px; margin-bottom: 25px; border: 1px solid #333; }
            input { width: 100%; padding: 18px; background: #222; border: 2px solid #444; color: white; border-radius: 12px; font-size: 16px; margin-bottom: 20px; }
            select { width: 100%; padding: 15px; background: #222; color: white; border: 2px solid #444; border-radius: 12px; margin-bottom: 25px; font-size: 16px; }
            button { width: 100%; padding: 20px; background: linear-gradient(135deg, #ff0000, #cc0000); color: white; border: none; border-radius: 12px; font-size: 20px; font-weight: bold; cursor: pointer; }
            button:disabled { opacity: 0.6; cursor: not-allowed; }
            .result { margin-top: 25px; padding: 25px; background: rgba(255,255,255,0.05); border-radius: 15px; display: none; border-left: 5px solid #444; }
            .success { border-left-color: #00ff00; }
            .error { border-left-color: #ff0000; }
            
            .platforms-grid { 
                display: grid; 
                grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); 
                gap: 15px; 
                margin: 30px 0; 
            }
            .platform-card { 
                background: #222; 
                padding: 20px 10px; 
                border-radius: 12px; 
                text-align: center; 
                border: 2px solid transparent;
                transition: all 0.3s;
            }
            .platform-card:hover { 
                border-color: #ff0000; 
                transform: translateY(-3px);
            }
            .platform-icon { 
                font-size: 32px; 
                margin-bottom: 8px; 
            }
            .platform-name { 
                font-size: 14px; 
                font-weight: bold; 
            }
            .platform-status { 
                font-size: 11px; 
                margin-top: 5px; 
                padding: 3px 8px; 
                border-radius: 10px; 
                display: inline-block; 
            }
            .status-working { background: #00ff00; color: black; }
            .status-youtube { background: #ff9900; color: black; }
            .status-testing { background: #0084ff; color: white; }
            
            .info-section { 
                background: rgba(255,255,255,0.05); 
                padding: 20px; 
                border-radius: 15px; 
                margin-top: 30px; 
            }
            .info-title { 
                color: #ff0000; 
                margin-bottom: 15px; 
                font-size: 18px; 
            }
            .info-grid { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 15px; 
            }
            .info-item { 
                padding: 12px; 
                background: #222; 
                border-radius: 8px; 
                font-size: 13px; 
            }
            .info-good { border-left: 4px solid #00ff00; }
            .info-bad { border-left: 4px solid #ff0000; }
            .info-note { border-left: 4px solid #ff9900; }
            
            .download-link { 
                display: inline-block; 
                margin-top: 15px; 
                padding: 15px 30px; 
                background: #00ff00; 
                color: black; 
                text-decoration: none; 
                border-radius: 8px; 
                font-weight: bold; 
                font-size: 18px; 
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎬 GrabAnyVideo</h1>
                <div class="subtitle">Universal Video Downloader - ALL Platforms Supported</div>
            </div>
            
            <div class="main-card">
                <input type="text" id="url" placeholder="🔗 Paste ANY video URL here..." autocomplete="off">
                
                <select id="quality">
                    <option value="best">🎯 Best Quality Available</option>
                    <option value="1080">📺 1080p HD</option>
                    <option value="720">📺 720p HD (Recommended)</option>
                    <option value="480">📱 480p Standard</option>
                </select>
                
                <button onclick="download()" id="btn">⬇️ DOWNLOAD VIDEO NOW</button>
                
                <div id="result" class="result"></div>
            </div>
            
            <div class="platforms-grid">
                <div class="platform-card">
                    <div class="platform-icon">🎬</div>
                    <div class="platform-name">YouTube</div>
                    <div class="platform-status status-youtube">Public Only</div>
                </div>
                <div class="platform-card">
                    <div class="platform-icon">🐦</div>
                    <div class="platform-name">Twitter/X</div>
                    <div class="platform-status status-working">✅ Working</div>
                </div>
                <div class="platform-card">
                    <div class="platform-icon">🎵</div>
                    <div class="platform-name">TikTok</div>
                    <div class="platform-status status-working">✅ Working</div>
                </div>
                <div class="platform-card">
                    <div class="platform-icon">📸</div>
                    <div class="platform-name">Instagram</div>
                    <div class="platform-status status-working">✅ Working</div>
                </div>
                <div class="platform-card">
                    <div class="platform-icon">📘</div>
                    <div class="platform-name">Facebook</div>
                    <div class="platform-status status-working">✅ Working</div>
                </div>
                <div class="platform-card">
                    <div class="platform-icon">🎥</div>
                    <div class="platform-name">Vimeo</div>
                    <div class="platform-status status-working">✅ Working</div>
                </div>
                <div class="platform-card">
                    <div class="platform-icon">🟣</div>
                    <div class="platform-name">Twitch</div>
                    <div class="platform-status status-working">✅ Working</div>
                </div>
                <div class="platform-card">
                    <div class="platform-icon">📺</div>
                    <div class="platform-name">Dailymotion</div>
                    <div class="platform-status status-working">✅ Working</div>
                </div>
                <div class="platform-card">
                    <div class="platform-icon">📱</div>
                    <div class="platform-name">Reddit</div>
                    <div class="platform-status status-working">✅ Working</div>
                </div>
                <div class="platform-card">
                    <div class="platform-icon">💼</div>
                    <div class="platform-name">LinkedIn</div>
                    <div class="platform-status status-working">✅ Working</div>
                </div>
                <div class="platform-card">
                    <div class="platform-icon">🎥</div>
                    <div class="platform-name">Zoom/Meets</div>
                    <div class="platform-status status-working">✅ Working</div>
                </div>
                <div class="platform-card">
                    <div class="platform-icon">📹</div>
                    <div class="platform-name">Rumble</div>
                    <div class="platform-status status-working">✅ Working</div>
                </div>
            </div>
            
            <div class="info-section">
                <div class="info-title">📋 Platform Information</div>
                <div class="info-grid">
                    <div class="info-item info-good">
                        <strong>✅ WORKING PERFECTLY:</strong><br>
                        • Twitter/X<br>
                        • TikTok<br>
                        • Instagram<br>
                        • Facebook<br>
                        • Vimeo<br>
                        • Twitch
                    </div>
                    <div class="info-item info-good">
                        <strong>✅ ALSO WORKING:</strong><br>
                        • Dailymotion<br>
                        • Reddit<br>
                        • LinkedIn<br>
                        • Zoom/Google Meets<br>
                        • Rumble<br>
                        • Bitchute
                    </div>
                    <div class="info-item info-note">
                        <strong>🔄 YOUTUBE NOTES:</strong><br>
                        • Public videos: ✅ Working<br>
                        • Age-restricted: ❌ Won't work<br>
                        • Private videos: ❌ Won't work<br>
                        • Members-only: ❌ Won't work
                    </div>
                    <div class="info-item info-bad">
                        <strong>⚠️ LIMITATIONS:</strong><br>
                        • YouTube age-restricted: No<br>
                        • Copyright-blocked: No<br>
                        • Region-locked: Sometimes<br>
                        • Requires login: No
                    </div>
                </div>
            </div>
        </div>

        <script>
            async function download() {
                const url = document.getElementById('url').value.trim();
                const quality = document.getElementById('quality').value;
                const btn = document.getElementById('btn');
                const result = document.getElementById('result');
                
                if(!url) {
                    showResult('❌ Please paste a video URL first!', 'error');
                    return;
                }
                
                if(!url.includes('http')) {
                    showResult('❌ Please enter a valid URL (include https://)', 'error');
                    return;
                }
                
                btn.disabled = true;
                btn.textContent = '⏳ Processing... (This may take up to 60 seconds)';
                result.style.display = 'none';

                try {
                    const res = await fetch('/api/download', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({url, quality})
                    });
                    
                    const data = await res.json();
                    
                    if(data.success) {
                        const sizeMB = data.size ? (data.size / 1024 / 1024).toFixed(1) + ' MB' : '';
                        showResult(
                            '✅ <strong style="font-size:20px;">DOWNLOAD READY!</strong><br>' +
                            '📁 <strong>File:</strong> ' + data.filename + '<br>' +
                            '🌐 <strong>Platform:</strong> ' + (data.site || 'Unknown').toUpperCase() + '<br>' +
                            '💾 <strong>Size:</strong> ' + sizeMB + '<br><br>' +
                            '<a href="' + data.downloadUrl + '" download class="download-link">📥 CLICK TO DOWNLOAD VIDEO</a>',
                            'success'
                        );
                    } else {
                        let errorMsg = '❌ ' + data.error;
                        if(data.error.includes('YouTube')) {
                            errorMsg += '<br><br>💡 <strong>YouTube Tip:</strong> Try a different public YouTube video.';
                        }
                        showResult(errorMsg, 'error');
                    }
                } catch(e) {
                    console.error(e);
                    showResult('❌ Network error. Please try again.', 'error');
                }
                
                btn.disabled = false;
                btn.textContent = '⬇️ DOWNLOAD VIDEO NOW';
            }
            
            function showResult(message, type) {
                const result = document.getElementById('result');
                result.innerHTML = message;
                result.className = 'result ' + type;
                result.style.display = 'block';
                result.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
            // Enter key support
            document.getElementById('url').addEventListener('keypress', function(e) {
                if(e.key === 'Enter') download();
            });
            
            // Auto-focus
            document.getElementById('url').focus();
            
            console.log('🎬 GrabAnyVideo loaded - All platforms supported!');
        </script>
    </body>
    </html>
    `);
});

// Clean old files every hour
setInterval(() => {
    try {
        const files = fs.readdirSync(downloadsDir);
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        let cleaned = 0;
        for (const file of files) {
            try {
                const filepath = path.join(downloadsDir, file);
                const stats = fs.statSync(filepath);
                if (now - stats.mtimeMs > oneHour) {
                    fs.unlinkSync(filepath);
                    cleaned++;
                }
            } catch (e) {
                // Ignore errors
            }
        }
        if (cleaned > 0) {
            console.log(`🧹 Cleaned ${cleaned} old files`);
        }
    } catch (e) {
        // Ignore cleanup errors
    }
}, 60 * 60 * 1000);

app.listen(PORT, () => console.log(`✅ Server running on ${PORT} - All Platforms Supported!`));