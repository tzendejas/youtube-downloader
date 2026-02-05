// 🎬 GRABANYVIDEO - IOS SPOOFING + IPV6 VERSION
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
// 1. Paths to binaries (We downloaded these in render-build.sh)
const BIN_DIR = path.join(__dirname, 'bin');
const YTDLP_PATH = path.join(BIN_DIR, 'yt-dlp');
const FFMPEG_PATH = path.join(BIN_DIR, 'ffmpeg');

// Create downloads directory
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

// Serve downloaded files
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

// === THE DOWNLOADER ===
async function downloadVideo(url, quality = 'best') {
    try {
        console.log(`🎬 Processing: ${url}`);
        
        const timestamp = Date.now();
        const filename = `video-${timestamp}.%(ext)s`;
        const outputTemplate = path.join(downloadsDir, filename);
        
        // === BUILD COMMAND ===
        // We use the LOCAL binary we downloaded (./bin/yt-dlp)
        let command = `"${YTDLP_PATH}" "${url}" -o "${outputTemplate}" --ffmpeg-location "${FFMPEG_PATH}" --no-warnings --no-check-certificate`;

        // === THE NEW MAGIC TRICK (IOS + IPV6) ===
        // 1. Pretend to be an iPhone (less blocked than Android)
        command += ' --extractor-args "youtube:player_client=ios"';
        
        // 2. Force IPv6 (This uses a different internet lane that is often not blocked)
        command += ' --force-ipv6';

        // Quality Selection
        if (quality === 'best') {
            command += ' -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"';
        } else if (quality === '1080') {
            command += ' -f "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080]"';
        } else if (quality === '720') {
            command += ' -f "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]"';
        } else {
            command += ' -f "best[ext=mp4]"';
        }

        // Use a generic User Agent
        command += ' --user-agent "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15"';

        console.log(`🔄 Executing: ${command}`);
        
        // Execute!
        await execPromise(command);
        
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
            throw new Error('File was not created');
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
        if (msg.includes("Sign in to confirm") || msg.includes("429")) {
            res.status(429).json({ success: false, error: "YouTube is fighting back. Try again in 5 mins." });
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
        <div class="info">Server Mode: iOS Spoofing + IPv6 (Bypass Active)</div>

        <script>
            async function download() {
                const url = document.getElementById('url').value;
                const quality = document.getElementById('quality').value;
                const btn = document.getElementById('btn');
                const result = document.getElementById('result');
                
                if(!url) return alert('Paste a URL first!');
                
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