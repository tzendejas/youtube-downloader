// 🎬 GRABANYVIDEO - FINAL PRODUCTION VERSION (AUTO-CONVERT TO MP4)
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
const FFMPEG_PATH = path.join(BIN_DIR, 'ffmpeg');

// === COOKIE CLONER ===
const SECRET_COOKIES = '/etc/secrets/cookies.txt';
const WRITABLE_COOKIES = path.join(__dirname, 'cookies_writable.txt');

function setupCookies() {
    try {
        if (fs.existsSync(SECRET_COOKIES)) {
            console.log('🍪 Found secret cookies. Cloning to writable path...');
            fs.copyFileSync(SECRET_COOKIES, WRITABLE_COOKIES);
            fs.chmodSync(WRITABLE_COOKIES, 0o600);
            return true;
        }
        return false;
    } catch (err) {
        console.error('Cookie setup failed:', err.message);
        return false;
    }
}

// Create downloads directory
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

app.use('/downloads', express.static(downloadsDir));

// === AUTO-DETECT SITE ===
function detectSite(url) {
    if (!url) return 'auto';
    const u = url.toLowerCase();
    if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
    if (u.includes('tiktok.com')) return 'tiktok';
    if (u.includes('instagram.com')) return 'instagram';
    if (u.includes('facebook.com') || u.includes('fb.watch')) return 'facebook';
    if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
    if (u.includes('vimeo.com')) return 'vimeo';
    if (u.includes('twitch.tv')) return 'twitch';
    return 'auto';
}

// === DOWNLOADER ===
async function downloadVideo(url, quality = 'best') {
    try {
        console.log(`🎬 Processing: ${url}`);
        
        const timestamp = Date.now();
        // We force .mp4 extension because we are converting
        const filename = `video-${timestamp}.mp4`; 
        const outputTemplate = path.join(downloadsDir, `video-${timestamp}.%(ext)s`);
        
        const hasCookies = setupCookies();
        
        // === BUILD COMMAND (THE FIX) ===
        // 1. REMOVED [ext=mp4] from format selection (fixes "Format Not Available")
        // 2. ADDED --merge-output-format mp4 (Converts WebM/MKV to MP4 automatically)
        let command = `"${YTDLP_PATH}" "${url}" -o "${outputTemplate}" --ffmpeg-location "${FFMPEG_PATH}" --merge-output-format mp4 --no-warnings --no-check-certificate --geo-bypass`;

        if (hasCookies) {
            console.log('🍪 Using Authenticated Cookies...');
            command += ` --cookies "${WRITABLE_COOKIES}"`;
        } else {
            console.warn('⚠️ No cookies found. Using fallback.');
            command += ' --extractor-args "youtube:player_client=android"'; 
        }

        // Quality Selection (Relaxed to allow ANY container)
        if (quality === 'best') {
            command += ' -f "bestvideo+bestaudio/best"';
        } else if (quality === '1080') {
            command += ' -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]/best"';
        } else if (quality === '720') {
            command += ' -f "bestvideo[height<=720]+bestaudio/best[height<=720]/best"';
        } else {
            command += ' -f "best"';
        }

        command += ' --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"';

        console.log(`🔄 Executing Download...`);
        
        await execPromise(command);
        
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
                site: detectSite(url)
            };
        } else {
            throw new Error('File not created');
        }

    } catch (error) {
        console.error('Download Error:', error.stderr || error.message);
        throw new Error(error.stderr || error.message || 'Download failed');
    }
}

// === API ENDPOINT ===
app.post('/api/download', async (req, res) => {
    try {
        const { url, quality } = req.body;
        if (!url) return res.status(400).json({ error: 'No URL provided' });

        const result = await downloadVideo(url, quality);
        
        res.json({
            success: true,
            message: 'Download Successful!',
            ...result
        });

    } catch (error) {
        const msg = error.message || 'Unknown Error';
        if (msg.includes("Sign in") || msg.includes("429")) {
            res.status(429).json({ success: false, error: "Authentication failed. Check cookies." });
        } else {
            res.status(500).json({ success: false, error: msg });
        }
    }
});

// === FRONTEND ===
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
            select { padding: 10px; background: #222; color: white; border: 1px solid #444; border-radius: 4px; margin-bottom: 20px; }
            .info { font-size: 12px; color: #666; margin-top: 20px; text-align: center; }
        </style>
    </head>
    <body>
        <h1>🎬 GrabAnyVideo</h1>
        <p>Supports YouTube, TikTok, Twitter, Instagram & More</p>
        
        <input type="text" id="url" placeholder="Paste ANY video URL here...">
        
        <select id="quality">
            <option value="best">Best Quality</option>
            <option value="1080">1080p</option>
            <option value="720">720p</option>
        </select>

        <button onclick="download()" id="btn">Download Video</button>
        <div id="result" class="result"></div>
        <div class="info">Server Mode: Auto-Convert to MP4 (Cookies Active)</div>

        <script>
            async function download() {
                const url = document.getElementById('url').value;
                const quality = document.getElementById('quality').value;
                const btn = document.getElementById('btn');
                const result = document.getElementById('result');
                
                if(!url) return alert('Paste a URL first!');
                
                btn.disabled = true;
                btn.textContent = '⏳ Downloading & Converting...';
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
                        result.innerHTML = '✅ <b>Success!</b> <a href="' + data.downloadUrl + '" download style="color:#0f0">Click here to save video</a>';
                    } else {
                        result.className = 'result error';
                        result.innerHTML = '❌ ' + data.error;
                    }
                } catch(e) {
                    result.style.display = 'block';
                    result.className = 'result error';
                    result.innerHTML = '❌ Network Error';
                }
                
                btn.disabled = false;
                btn.textContent = 'Download Video';
            }
        </script>
    </body>
    </html>
    `);
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));