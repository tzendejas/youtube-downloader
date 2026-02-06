// 🎬 GRABANYVIDEO - NO-COOKIES SIMPLE VERSION
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

// === SIMPLE UNIVERSAL DOWNLOADER ===
async function downloadVideo(url, quality = 'best') {
    try {
        console.log(`🎬 Processing: ${url}`);
        
        const timestamp = Date.now();
        const outputPath = path.join(downloadsDir, `video-${timestamp}.mp4`);
        
        // Build command
        let command = `"${YTDLP_PATH}" "${url}" -o "${outputPath}"`;
        
        // Check if it's YouTube
        const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
        
        if (isYouTube) {
            console.log('🎬 YouTube - Using Android method');
            
            // SIMPLE YOUTUBE COMMAND THAT WORKS
            // Limit to 720p max for reliability
            if (quality === 'best' || quality === '1080' || quality === '720') {
                command += ' -f "best[height<=720]"';
            } else if (quality === '480') {
                command += ' -f "best[height<=480]"';
            }
            
            // Android user agent (less likely to be blocked)
            command += ' --user-agent "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36"';
            command += ' --referer "https://www.youtube.com/"';
            command += ' --extractor-args "youtube:player_client=android"';
            
        } else {
            // === NON-YOUTUBE SITES (KEEP WORKING CODE) ===
            console.log('🌐 Non-YouTube site');
            
            if (quality === 'best') {
                command += ' -f "best[ext=mp4]"';
            } else if (quality === '1080') {
                command += ' -f "best[height<=1080][ext=mp4]"';
            } else if (quality === '720') {
                command += ' -f "best[height<=720][ext=mp4]"';
            } else if (quality === '480') {
                command += ' -f "best[height<=480][ext=mp4]"';
            }
            
            command += ' --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"';
        }
        
        // Common options
        command += ' --no-warnings --no-check-certificate --geo-bypass';
        command += ' --merge-output-format mp4';
        
        console.log(`🔄 Executing...`);
        
        await execPromise(command, { timeout: 300000 });
        
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
            throw new Error('File not created');
        }

    } catch (error) {
        console.error('Download Error:', error.message);
        
        const errStr = error.stderr || error.message || '';
        
        if (errStr.includes('Sign in to confirm')) {
            throw new Error('YouTube blocked. Try a different public video (not age-restricted).');
        }
        
        if (errStr.includes('Requested format is not available')) {
            throw new Error('Try "Best Quality" or lower resolution.');
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
        <title>🎬 GrabAnyVideo - Simple & Working</title>
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
        <p>Simple & Working Video Downloader</p>
        
        <input type="text" id="url" placeholder="Paste ANY video URL here...">
        
        <select id="quality">
            <option value="best">Best Quality Available</option>
            <option value="720">720p (Recommended for YouTube)</option>
            <option value="480">480p</option>
        </select>

        <button onclick="download()" id="btn">Download Video</button>
        <div id="result" class="result"></div>
        <div class="info">
            <strong>✅ Twitter/X, TikTok, Instagram - Working</strong><br>
            <strong>🔄 YouTube - Public videos only (720p max)</strong><br>
            <small>Age-restricted YouTube videos will not work</small>
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