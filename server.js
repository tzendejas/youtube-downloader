// 🎬 GRABANYVIDEO - TRULY FIXED ALL-PLATFORM VERSION
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

// === COOKIE SETUP ===
const SECRET_COOKIES = '/etc/secrets/cookies.txt';
const WRITABLE_COOKIES = path.join(__dirname, 'yt_cookies.txt');

function setupYouTubeCookies() {
    try {
        if (fs.existsSync(SECRET_COOKIES)) {
            console.log('🍪 Loading cookies...');
            const cookieContent = fs.readFileSync(SECRET_COOKIES, 'utf8');
            fs.writeFileSync(WRITABLE_COOKIES, cookieContent);
            fs.chmodSync(WRITABLE_COOKIES, 0o600);
            return true;
        }
        console.log('⚠️ No secret cookies found');
        return false;
    } catch (err) {
        console.error('Cookie error:', err.message);
        return false;
    }
}

// Create downloads directory
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
    return 'other';
}

// === DOWNLOADER ===
async function downloadVideo(url, quality = 'best') {
    try {
        console.log(`🎬 Processing: ${url}`);
        
        const timestamp = Date.now();
        const outputPath = path.join(downloadsDir, `video-${timestamp}.mp4`);
        const siteType = detectSite(url);
        const hasCookies = setupYouTubeCookies();
        
        // === YOUTUBE HANDLING ===
        if (siteType === 'youtube') {
            console.log('🎬 YouTube - Using Smart Logic + Cookies');
            
            // Define the Cookie Flag string
            let cookieFlag = "";
            if (hasCookies) {
                console.log('🍪 Injecting Cookies into command...');
                cookieFlag = ` --cookies "${WRITABLE_COOKIES}"`;
            } else {
                console.log('⚠️ No cookies available. Age-restricted videos will fail.');
            }

            let lastError = null;
            
            // --- Method 1: Android Client (Best for speed) ---
            try {
                // IMPORTANT: We inject cookieFlag here!
                let ytCmd = `"${YTDLP_PATH}" "${url}" -o "${outputPath}" ${cookieFlag}`;
                
                // Format selection
                if (quality === 'best') ytCmd += ' -f "best[height<=720]"';
                else if (quality === '1080') ytCmd += ' -f "best[height<=1080]"';
                else ytCmd += ' -f "best[height<=480]"';

                ytCmd += ' --extractor-args "youtube:player_client=android"';
                // Android User Agent
                ytCmd += ' --user-agent "Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36"';
                ytCmd += ' --no-warnings --no-check-certificate --geo-bypass';
                ytCmd += ' --merge-output-format mp4 --ignore-errors';
                
                console.log('🔄 Method 1: Android client');
                await execPromise(ytCmd, { timeout: 120000 });
                
                if (fs.existsSync(outputPath)) return createSuccessResponse(outputPath, timestamp, 'youtube');
            } catch (err1) {
                lastError = err1;
                console.log('⚠️ Method 1 failed, trying Method 2...');
            }
            
            // --- Method 2: Web Client (Best for compatibility) ---
            try {
                // IMPORTANT: We inject cookieFlag here too!
                let ytCmd = `"${YTDLP_PATH}" "${url}" -o "${outputPath}" ${cookieFlag}`;
                ytCmd += ' -f "best"';
                ytCmd += ' --extractor-args "youtube:player_client=web"';
                // Desktop User Agent
                ytCmd += ' --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"';
                ytCmd += ' --no-warnings --no-check-certificate --geo-bypass';
                ytCmd += ' --merge-output-format mp4 --ignore-errors';
                
                console.log('🔄 Method 2: Web client');
                await execPromise(ytCmd, { timeout: 120000 });
                
                if (fs.existsSync(outputPath)) return createSuccessResponse(outputPath, timestamp, 'youtube');
            } catch (err2) {
                lastError = err2;
                console.log('⚠️ Method 2 failed.');
            }
            
            throw new Error('YouTube download failed. Check cookies if video is age-restricted.');
            
        } else {
            // === ALL OTHER SITES (Vimeo, Zoom, TikTok, etc.) ===
            console.log(`🌐 ${siteType.toUpperCase()} - Standard download`);
            
            let command = `"${YTDLP_PATH}" "${url}" -o "${outputPath}"`;
            
            // Quality & Format
            if (quality === 'best') command += ' -f "best[ext=mp4]/best"';
            else command += ' -f "best[height<=720][ext=mp4]/best[height<=720]"';
            
            // Universal options
            command += ' --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"';
            command += ' --no-warnings --no-check-certificate --geo-bypass';
            command += ' --merge-output-format mp4 --ignore-errors';
            
            console.log(`🔄 Executing...`);
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

// Helper function
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
        res.json({ success: true, message: '✅ Download Successful!', ...result });

    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === FRONTEND ===
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🎬 GrabAnyVideo Ultimate</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: sans-serif; background: #111; color: white; padding: 20px; max-width: 900px; margin: 0 auto; }
            input, select { width: 100%; padding: 15px; background: #222; border: 1px solid #444; color: white; margin-bottom: 20px; border-radius: 8px; }
            button { width: 100%; padding: 20px; background: #e50914; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; }
            .result { margin-top: 20px; padding: 15px; background: #222; border-radius: 8px; display: none; }
            .success { border-left: 4px solid #0f0; }
            .error { border-left: 4px solid #f00; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; margin: 20px 0; }
            .card { background: #222; padding: 10px; text-align: center; border-radius: 8px; font-size: 12px; }
        </style>
    </head>
    <body>
        <h1>🎬 GrabAnyVideo Ultimate</h1>
        <div class="grid">
            <div class="card">✅ YouTube</div><div class="card">✅ TikTok</div><div class="card">✅ Twitter</div>
            <div class="card">✅ Instagram</div><div class="card">✅ Vimeo</div><div class="card">✅ Zoom</div>
        </div>
        
        <input type="text" id="url" placeholder="Paste ANY video URL here...">
        <select id="quality">
            <option value="best">Best Quality</option>
            <option value="720">720p</option>
            <option value="480">480p</option>
        </select>
        <button onclick="download()" id="btn">Download Video</button>
        <div id="result" class="result"></div>

        <script>
            async function download() {
                const url = document.getElementById('url').value;
                const quality = document.getElementById('quality').value;
                const btn = document.getElementById('btn');
                const result = document.getElementById('result');
                
                if(!url) return alert('Paste URL first!');
                
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
                        result.innerHTML = '✅ <b>Success!</b> <a href="' + data.downloadUrl + '" download style="color:#0f0">Click to Download</a>';
                    } else {
                        result.className = 'result error';
                        result.innerHTML = '❌ ' + data.error;
                    }
                } catch(e) {
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

// Cleanup old files
setInterval(() => {
    try {
        const files = fs.readdirSync(downloadsDir);
        const now = Date.now();
        for (const file of files) {
            if (now - fs.statSync(path.join(downloadsDir, file)).mtimeMs > 3600000) {
                fs.unlinkSync(path.join(downloadsDir, file));
            }
        }
    } catch (e) {}
}, 3600000);

app.listen(PORT, () => console.log(`✅ Server running on ${PORT}`));