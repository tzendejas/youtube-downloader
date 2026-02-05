// 🎬 GRABANYVIDEO - SMART RETRY VERSION (iOS + EMBEDDED FALLBACK)
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

// === EXECUTE COMMAND WRAPPER ===
async function runCommand(command) {
    console.log(`🔄 Trying Strategy: ${command}`);
    return await execPromise(command);
}

// === THE DOWNLOADER ===
async function downloadVideo(url, quality = 'best') {
    const timestamp = Date.now();
    const filename = `video-${timestamp}.%(ext)s`;
    const outputTemplate = path.join(downloadsDir, filename);
    
    // Base options for ALL attempts
    const baseCommand = `"${YTDLP_PATH}" "${url}" -o "${outputTemplate}" --ffmpeg-location "${FFMPEG_PATH}" --no-warnings --no-check-certificate --geo-bypass`;
    
    // Quality options
    let qualityArgs = '';
    if (quality === 'best') {
        qualityArgs = ' -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"';
    } else if (quality === '1080') {
        qualityArgs = ' -f "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080]"';
    } else if (quality === '720') {
        qualityArgs = ' -f "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]"';
    } else {
        qualityArgs = ' -f "best[ext=mp4]"';
    }

    try {
        console.log(`🎬 Processing: ${url}`);

        // === STRATEGY 1: iOS Client (Standard IPv4) ===
        // This is the most reliable "Public" method right now
        try {
            const cmd1 = `${baseCommand} ${qualityArgs} --extractor-args "youtube:player_client=ios" --user-agent "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"`;
            await runCommand(cmd1);
        } catch (e1) {
            console.warn("⚠️ Strategy 1 (iOS) failed. Trying Strategy 2...");
            
            // === STRATEGY 2: Embedded Player ===
            // Tricks YT into thinking the video is embedded on a generic website
            const cmd2 = `${baseCommand} ${qualityArgs} --extractor-args "youtube:player_client=web_embedded" --referer "https://www.google.com/"`;
            await runCommand(cmd2);
        }
        
        // Find the created file
        const files = fs.readdirSync(downloadsDir);
        const downloadedFile = files.find(f => f.startsWith(`video-${timestamp}`));
        
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
            throw new Error('File was not created by any strategy');
        }

    } catch (error) {
        console.error('Final Download Error:', error.stderr || error.message);
        throw new Error(error.stderr || error.message || 'All download strategies failed.');
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
            res.status(429).json({ success: false, error: "YouTube is strictly blocking Render's IPs right now. Please try again later or use a different video." });
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
        <title>🎬 GrabAnyVideo - Public Mode</title>
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
        <h1>🎬 GrabAnyVideo Universal</h1>
        <p>Download from YouTube, TikTok, Insta & more!</p>
        
        <input type="text" id="url" placeholder="Paste ANY video URL here...">
        
        <select id="quality">
            <option value="best">Best Quality</option>
            <option value="1080">1080p</option>
            <option value="720">720p</option>
        </select>

        <button onclick="download()" id="btn">Download Video</button>
        <div id="result" class="result"></div>
        <div class="info">Server Mode: Smart Retry (iOS + Embedded)</div>

        <script>
            async function download() {
                const url = document.getElementById('url').value;
                const quality = document.getElementById('quality').value;
                const btn = document.getElementById('btn');
                const result = document.getElementById('result');
                
                if(!url) return alert('Paste a URL first!');
                
                btn.disabled = true;
                btn.textContent = '⏳ Downloading (this might take 30s)...';
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