// 🎬 GRABANYVIDEO - COMPLETE WORKING VERSION (WITH YOUTUBE COOKIES)
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

// === YOUTUBE COOKIE SETUP ===
const SECRET_COOKIES = '/etc/secrets/cookies.txt';
const WRITABLE_COOKIES = path.join(__dirname, 'cookies.txt');

function setupYouTubeCookies() {
    try {
        if (fs.existsSync(SECRET_COOKIES)) {
            console.log('🍪 Found YouTube cookies in secrets...');
            // Copy from Render secrets to a writable location
            fs.copyFileSync(SECRET_COOKIES, WRITABLE_COOKIES);
            fs.chmodSync(WRITABLE_COOKIES, 0o600);
            return true;
        }
        console.log('⚠️ No YouTube cookies found in secrets');
        return false;
    } catch (err) {
        console.error('Cookie setup error:', err.message);
        return false;
    }
}

// Create directories
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

app.use('/downloads', express.static(downloadsDir));

// === SIMPLE DOWNLOADER ===
async function downloadVideo(url, quality = 'best') {
    try {
        console.log(`🎬 Processing: ${url}`);
        
        const timestamp = Date.now();
        const outputPath = path.join(downloadsDir, `video-${timestamp}.%(ext)s`);
        
        // Check if it's YouTube
        const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
        
        // Build command
        let command = `"${YTDLP_PATH}" "${url}" -o "${outputPath}"`;
        
        // === YOUTUBE-SPECIFIC HANDLING ===
        if (isYouTube) {
            console.log('🎬 Detected YouTube video');
            
            // Setup cookies for YouTube
            const hasCookies = setupYouTubeCookies();
            
            // Use cookies if available
            if (hasCookies && fs.existsSync(WRITABLE_COOKIES)) {
                console.log('🍪 Using YouTube cookies...');
                command += ` --cookies "${WRITABLE_COOKIES}"`;
            } else {
                console.log('⚠️ No cookies, using Android fallback...');
                // Fallback: Use Android client to avoid bot detection
                command += ' --extractor-args "youtube:player_client=android"';
                command += ' --throttled-rate 100K';
            }
            
            // YouTube format selection (more reliable)
            if (quality === 'best') {
                command += ' -f "bestvideo[height<=1080]+bestaudio/best"';
            } else if (quality === '1080') {
                command += ' -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]"';
            } else if (quality === '720') {
                command += ' -f "bestvideo[height<=720]+bestaudio/best[height<=720]"';
            } else if (quality === '480') {
                command += ' -f "bestvideo[height<=480]+bestaudio/best[height<=480]"';
            }
            
            // YouTube-specific options
            command += ' --user-agent "Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36"';
            command += ' --referer "https://www.youtube.com/"';
            
        } else {
            // === NON-YOUTUBE SITES (KEEP WORKING AS IS) ===
            console.log('🌐 Detected non-YouTube site');
            
            // Keep existing working format for other sites
            if (quality === 'best') {
                command += ' -f "best[ext=mp4]"';
            } else if (quality === '1080') {
                command += ' -f "best[height<=1080][ext=mp4]"';
            } else if (quality === '720') {
                command += ' -f "best[height<=720][ext=mp4]"';
            } else if (quality === '480') {
                command += ' -f "best[height<=480][ext=mp4]"';
            }
            
            // Standard user agent for other sites
            command += ' --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"';
        }
        
        // Common options for ALL sites
        command += ' --no-warnings --no-check-certificate --geo-bypass';
        command += ' --merge-output-format mp4'; // Force MP4 for all
        
        console.log(`🔄 Executing: ${command.substring(0, 150)}...`);
        
        await execPromise(command, { timeout: 300000 }); // 5 minute timeout
        
        // Find the created file
        const files = fs.readdirSync(downloadsDir);
        const downloadedFile = files.find(f => f.includes(timestamp.toString()));
        
        if (downloadedFile) {
            const filepath = path.join(downloadsDir, downloadedFile);
            const stats = fs.statSync(filepath);
            
            return {
                success: true,
                filename: downloadedFile,
                downloadUrl: `/downloads/${downloadedFile}`,
                size: stats.size,
                site: isYouTube ? 'youtube' : 'other'
            };
        } else {
            throw new Error('File not created. Try a different video.');
        }

    } catch (error) {
        console.error('Download Error:', error.message);
        
        // Better error messages
        const errStr = error.stderr || error.message || '';
        
        if (errStr.includes('Sign in to confirm')) {
            throw new Error('YouTube blocked the request. Need fresh cookies or try different video.');
        }
        
        if (errStr.includes('Requested format is not available')) {
            throw new Error('Requested quality not available. Try lower quality.');
        }
        
        throw new Error('Download failed: ' + errStr.substring(0, 100));
    }
}

// === API ENDPOINT ===
app.post('/api/download', async (req, res) => {
    try {
        const { url, quality = 'best' } = req.body;
        if (!url) return res.status(400).json({ error: 'No URL provided' });

        const result = await downloadVideo(url, quality);
        
        res.json({
            success: true,
            message: 'Download Successful!',
            ...result
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message,
            tip: error.message.includes('YouTube') ? 
                'YouTube may need fresh cookies. Other sites should work fine.' :
                'Try a different video or lower quality.'
        });
    }
});

// === SIMPLE FRONTEND ===
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🎬 GrabAnyVideo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: sans-serif; background: #111; color: white; padding: 20px; max-width: 800px; margin: 0 auto; }
            input { width: 100%; padding: 15px; background: #222; border: 1px solid #444; color: white; margin-bottom: 20px; border-radius: 8px; }
            button { width: 100%; padding: 15px; background: #e50914; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
            button:disabled { background: #555; }
            .result { margin-top: 20px; padding: 15px; background: #222; border-radius: 8px; display: none; }
            .success { border-left: 4px solid #0f0; }
            .error { border-left: 4px solid #f00; }
            select { padding: 10px; background: #222; color: white; border: 1px solid #444; border-radius: 4px; margin-bottom: 20px; width: 100%; }
            .info { font-size: 12px; color: #666; margin-top: 20px; text-align: center; }
            .site-badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; margin-left: 5px; }
            .youtube-badge { background: #ff0000; }
            .other-badge { background: #0084ff; }
        </style>
    </head>
    <body>
        <h1>🎬 GrabAnyVideo</h1>
        <p>Universal Video Downloader</p>
        
        <input type="text" id="url" placeholder="Paste ANY video URL here...">
        
        <select id="quality">
            <option value="best">Best Quality</option>
            <option value="1080">1080p</option>
            <option value="720">720p</option>
            <option value="480">480p</option>
        </select>

        <button onclick="download()" id="btn">Download Video</button>
        <div id="result" class="result"></div>
        
        <div class="info">
            ✅ <strong>All platforms supported</strong><br>
            🍪 <strong>YouTube:</strong> Using cookies for better success<br>
            ⚡ <strong>Other sites:</strong> Direct downloads
        </div>

        <script>
            async function download() {
                const url = document.getElementById('url').value.trim();
                const quality = document.getElementById('quality').value;
                const btn = document.getElementById('btn');
                const result = document.getElementById('result');
                
                if(!url) {
                    result.style.display = 'block';
                    result.className = 'result error';
                    result.innerHTML = '❌ Paste a URL first!';
                    return;
                }
                
                btn.disabled = true;
                btn.textContent = '⏳ Downloading...';
                result.style.display = 'none';

                try {
                    const res = await fetch('/api/download', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({url, quality})
                    });
                    
                    const data = await res.json();
                    
                    result.style.display = 'block';
                    if(data.success) {
                        result.className = 'result success';
                        const badge = data.site === 'youtube' ? 
                            '<span class="site-badge youtube-badge">YouTube</span>' : 
                            '<span class="site-badge other-badge">Other</span>';
                        result.innerHTML = '✅ <b>Success!</b> ' + badge + '<br><br>';
                        result.innerHTML += '<a href="' + data.downloadUrl + '" download style="color:#0f0;font-weight:bold;font-size:16px;">📥 Click here to download video</a>';
                        if(data.size) {
                            const sizeMB = (data.size / 1024 / 1024).toFixed(1);
                            result.innerHTML += '<br><small>Size: ' + sizeMB + ' MB</small>';
                        }
                    } else {
                        result.className = 'result error';
                        result.innerHTML = '❌ ' + data.error;
                        if(data.tip) {
                            result.innerHTML += '<br><small style="color:#aaa;">💡 ' + data.tip + '</small>';
                        }
                    }
                } catch(e) {
                    result.style.display = 'block';
                    result.className = 'result error';
                    result.innerHTML = '❌ Network Error';
                }
                
                btn.disabled = false;
                btn.textContent = 'Download Video';
            }
            
            document.getElementById('url').addEventListener('keypress', function(e) {
                if(e.key === 'Enter') download();
            });
        </script>
    </body>
    </html>
    `);
});

// Clean up old files periodically
setInterval(() => {
    try {
        const files = fs.readdirSync(downloadsDir);
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        files.forEach(file => {
            const filepath = path.join(downloadsDir, file);
            try {
                const stats = fs.statSync(filepath);
                if (now - stats.mtimeMs > oneHour) {
                    fs.unlinkSync(filepath);
                    console.log(`🧹 Cleaned up: ${file}`);
                }
            } catch (e) {
                // Ignore errors
            }
        });
    } catch (e) {
        // Ignore cleanup errors
    }
}, 30 * 60 * 1000); // Every 30 minutes

app.listen(PORT, () => console.log(`✅ Server running on ${PORT}`));