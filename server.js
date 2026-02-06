// 🎬 GRABANYVIDEO - FIXED VERSION
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
            console.log('🍪 Cloning secret cookies...');
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
        const outputTemplate = path.join(downloadsDir, `video-${timestamp}.%(ext)s`);
        
        const hasCookies = setupCookies();
        
        // === BUILD COMMAND ===
        // Base command
        let command = `"${YTDLP_PATH}" "${url}" -o "${outputTemplate}"`;
        
        // Add ffmpeg location if ffmpeg exists
        if (fs.existsSync(FFMPEG_PATH)) {
            command += ` --ffmpeg-location "${BIN_DIR}"`;
        }
        
        // Force MP4 format
        command += ' --merge-output-format mp4';
        
        // General options
        command += ' --no-warnings --no-check-certificate --geo-bypass --ignore-errors';
        
        // === COOKIES ===
        if (hasCookies) {
            console.log('🍪 Using Cookies...');
            command += ` --cookies "${WRITABLE_COOKIES}"`;
        } else {
            console.warn('⚠️ No cookies found.');
            command += ' --extractor-args "youtube:player_client=android"';
        }
        
        // === QUALITY SELECTION - SIMPLE WORKING VERSION ===
        if (quality === 'best') {
            // Default best
        } else if (quality === '4k') {
            command += ' -f "bestvideo[height<=2160]+bestaudio/best[height<=2160]"';
        } else if (quality === '2k') {
            command += ' -f "bestvideo[height<=1440]+bestaudio/best[height<=1440]"';
        } else if (quality === '1080') {
            command += ' -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]"';
        } else if (quality === '720') {
            command += ' -f "bestvideo[height<=720]+bestaudio/best[height<=720]"';
        } else if (quality === '480') {
            command += ' -f "bestvideo[height<=480]+bestaudio/best[height<=480]"';
        }
        
        // User Agent
        command += ' --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"';
        command += ' --referer "https://www.youtube.com/"';
        
        console.log(`🔄 Executing...`);
        console.log(`Command: ${command.substring(0, 200)}...`);
        
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
            throw new Error('File not created. Try a different video or lower quality.');
        }

    } catch (error) {
        console.error('Download Error:', error.message);
        const errStr = error.stderr || error.message || '';
        
        if (errStr.includes("Requested format is not available")) {
            // Try again with simpler format
            console.log('🔄 Retrying with simpler format...');
            try {
                // Retry with just best quality
                const timestamp = Date.now();
                const outputTemplate = path.join(downloadsDir, `video-${timestamp}.%(ext)s`);
                let retryCommand = `"${YTDLP_PATH}" "${url}" -o "${outputTemplate}" -f "best" --no-warnings`;
                
                if (fs.existsSync(FFMPEG_PATH)) {
                    retryCommand += ` --ffmpeg-location "${BIN_DIR}"`;
                }
                retryCommand += ' --merge-output-format mp4';
                
                await execPromise(retryCommand);
                
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
                }
            } catch (retryError) {
                console.error('Retry failed:', retryError.message);
            }
            
            throw new Error("Requested quality not available. Try 'Best Quality' instead.");
        }
        
        if (errStr.includes("Sign in") || errStr.includes("private")) {
            throw new Error("Video is private or age-restricted. Need fresh cookies.");
        }
        
        throw new Error("Download failed: " + errStr.substring(0, 100));
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
        res.status(500).json({ success: false, error: error.message });
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
            select { padding: 10px; background: #222; color: white; border: 1px solid #444; border-radius: 4px; margin-bottom: 20px; width: 100%; }
            .info { font-size: 12px; color: #666; margin-top: 20px; text-align: center; }
            .success-link { color: #0f0; font-weight: bold; text-decoration: none; }
            .success-link:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <h1>🎬 GrabAnyVideo</h1>
        <p>Supports YouTube, TikTok, Twitter, Instagram & More</p>
        
        <input type="text" id="url" placeholder="Paste ANY video URL here...">
        
        <select id="quality">
            <option value="best">Best Quality Available</option>
            <option value="1080">1080p</option>
            <option value="720">720p</option>
            <option value="480">480p</option>
            <option value="4k">4K (if available)</option>
            <option value="2k">2K (if available)</option>
        </select>

        <button onclick="download()" id="btn">Download Video</button>
        <div id="result" class="result"></div>
        <div class="info">Fixed Version | Auto-retry on failure</div>

        <script>
            async function download() {
                const url = document.getElementById('url').value;
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
                        result.innerHTML = '✅ <b>Success!</b><br>';
                        result.innerHTML += 'File: ' + data.filename + '<br>';
                        result.innerHTML += 'Size: ' + Math.round(data.size / 1024 / 1024) + ' MB<br>';
                        result.innerHTML += '<a href="' + data.downloadUrl + '" download class="success-link">📥 Click here to download</a>';
                    } else {
                        result.className = 'result error';
                        result.innerHTML = '❌ ' + data.error;
                    }
                } catch(e) {
                    result.style.display = 'block';
                    result.className = 'result error';
                    result.innerHTML = '❌ Network Error - Check server';
                }
                
                btn.disabled = false;
                btn.textContent = 'Download Video';
            }
            
            // Press Enter to download
            document.getElementById('url').addEventListener('keypress', function(e) {
                if(e.key === 'Enter') download();
            });
        </script>
    </body>
    </html>
    `);
});

app.listen(PORT, () => console.log(`Server running on ${PORT}`));