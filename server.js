// 🎬 GRABANYVIDEO - SIMPLE HYBRID (STABLE + AGE RESTRICTED SUPPORT)
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

// === COOKIE SETUP (THE KEY FOR AGE RESTRICTION) ===
const SECRET_COOKIES = '/etc/secrets/cookies.txt';
const WRITABLE_COOKIES = path.join(__dirname, 'cookies_writable.txt');

function setupCookies() {
    try {
        // If the secret file exists (you added it in Render Dashboard)
        if (fs.existsSync(SECRET_COOKIES)) {
            console.log('🍪 Found secret cookies. Making them usable...');
            // Copy to a place we can read/write
            fs.copyFileSync(SECRET_COOKIES, WRITABLE_COOKIES);
            fs.chmodSync(WRITABLE_COOKIES, 0o600);
            return true;
        }
        return false;
    } catch (err) {
        console.error('Cookie setup warning:', err.message);
        return false;
    }
}

// Create directories
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

app.use('/downloads', express.static(downloadsDir));

// === UNIVERSAL DOWNLOADER ===
async function downloadVideo(url, quality = 'best') {
    try {
        console.log(`🎬 Processing: ${url}`);
        
        const timestamp = Date.now();
        const outputPath = path.join(downloadsDir, `video-${timestamp}.mp4`);
        const hasCookies = setupCookies();
        
        // Build base command
        let command = `"${YTDLP_PATH}" "${url}" -o "${outputPath}"`;
        
        // Check if it's YouTube
        const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
        
        if (isYouTube) {
            console.log('🎬 YouTube Detected');
            
            if (hasCookies) {
                // === MODE A: LOGGED IN (Age Restricted Works) ===
                console.log('🔓 Using Cookies to bypass Age Restriction');
                command += ` --cookies "${WRITABLE_COOKIES}"`;
                // Use desktop user agent to match your cookies
                command += ' --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"';
            } else {
                // === MODE B: ANDROID SPOOF (Public Videos Only) ===
                console.log('📱 No cookies found. Using Android spoofing.');
                command += ' --extractor-args "youtube:player_client=android"';
                command += ' --user-agent "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36"';
            }

            // Reliable Format Selection (Keeps it stable like the simple script)
            if (quality === 'best' || quality === '720') {
                command += ' -f "best[height<=720]"';
            } else if (quality === '480') {
                command += ' -f "best[height<=480]"';
            } else {
                // Fallback for 1080p requests -> cap at 720p to prevent crashes
                command += ' -f "best[height<=720]"'; 
            }
            
        } else {
            // === NON-YOUTUBE SITES (TikTok, Insta, X) ===
            console.log('🌐 Non-YouTube site (Using standard logic)');
            
            if (quality === 'best') {
                command += ' -f "best[ext=mp4]"';
            } else {
                command += ' -f "best[height<=720][ext=mp4]"';
            }
            command += ' --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"';
        }
        
        // Universal Options (Crash Prevention)
        command += ' --no-warnings --no-check-certificate --geo-bypass';
        // Only merge if we actually have ffmpeg (prevents "format not available" crashes)
        if (fs.existsSync(path.join(BIN_DIR, 'ffmpeg'))) {
             command += ' --merge-output-format mp4';
        }
        
        console.log(`🔄 Executing...`);
        
        await execPromise(command, { timeout: 300000 }); // 5 min timeout
        
        // Check result
        if (fs.existsSync(outputPath)) {
            const stats = fs.statSync(outputPath);
            const filename = `video-${timestamp}.mp4`;
            
            console.log(`✅ Downloaded: ${filename} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
            
            return {
                success: true,
                filename: filename,
                downloadUrl: `/downloads/${filename}`,
                size: stats.size
            };
        } else {
            // Try finding any file that yt-dlp might have named differently
            const files = fs.readdirSync(downloadsDir);
            const fallbackFile = files.find(f => f.startsWith(`video-${timestamp}`));
            
            if (fallbackFile) {
                const stats = fs.statSync(path.join(downloadsDir, fallbackFile));
                return {
                    success: true,
                    filename: fallbackFile,
                    downloadUrl: `/downloads/${fallbackFile}`,
                    size: stats.size
                };
            }
            throw new Error('File not created');
        }

    } catch (error) {
        console.error('Download Error:', error.message);
        
        const errStr = error.stderr || error.message || '';
        
        if (errStr.includes('Sign in to confirm')) {
            throw new Error('YouTube Blocked: You need to update the cookies.txt file in Render secrets.');
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
            error: error.message
        });
    }
});

// === FRONTEND ===
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🎬 GrabAnyVideo - Hybrid</title>
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
        </style>
    </head>
    <body>
        <h1>🎬 GrabAnyVideo</h1>
        <p>Stable Video Downloader (Age Restricted Supported)</p>
        
        <input type="text" id="url" placeholder="Paste ANY video URL here...">
        
        <select id="quality">
            <option value="best">Best Quality Available</option>
            <option value="720">720p (Fastest)</option>
            <option value="480">480p</option>
        </select>

        <button onclick="download()" id="btn">Download Video</button>
        <div id="result" class="result"></div>
        <div class="info">
            <strong>✅ Works on: YouTube, TikTok, Insta, X</strong><br>
            <small>If age-restricted fails, update Render cookies.txt</small>
        </div>

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
            
            document.getElementById('url').addEventListener('keypress', function(e) {
                if(e.key === 'Enter') download();
            });
        </script>
    </body>
    </html>
    `);
});

app.listen(PORT, () => console.log(`✅ Server running on ${PORT}`));