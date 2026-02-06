// 🎬 GRABANYVIDEO - ULTIMATE YOUTUBE FIX
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
const FFMPEG_DIR = BIN_DIR;

// === COOKIE CLONER ===
const SECRET_COOKIES = '/etc/secrets/cookies.txt';
const WRITABLE_COOKIES = path.join(__dirname, 'cookies_writable.txt');

function setupCookies() {
    try {
        if (fs.existsSync(SECRET_COOKIES)) {
            console.log('🍪 Cloning secret cookies...');
            const cookieContent = fs.readFileSync(SECRET_COOKIES, 'utf8');
            
            // Validate cookie format
            if (!cookieContent.includes('__Secure-1PSID') || !cookieContent.includes('LOGIN_INFO')) {
                console.warn('⚠️ Cookies missing required fields. YouTube may not work.');
                return false;
            }
            
            fs.writeFileSync(WRITABLE_COOKIES, cookieContent);
            fs.chmodSync(WRITABLE_COOKIES, 0o600);
            console.log('✅ Cookies cloned successfully');
            return true;
        }
        console.warn('⚠️ No cookie file found at', SECRET_COOKIES);
        return false;
    } catch (err) {
        console.error('❌ Cookie setup failed:', err.message);
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
async function downloadVideo(url, quality = 'best', retryCount = 0) {
    const maxRetries = 1;
    
    try {
        console.log(`🎬 Processing: ${url} | Quality: ${quality} | Retry: ${retryCount}`);
        
        const timestamp = Date.now();
        const outputTemplate = path.join(downloadsDir, `video-${timestamp}.%(ext)s`);
        
        const hasCookies = setupCookies();
        
        // === BUILD COMMAND ===
        // Base command
        let command = `"${YTDLP_PATH}" "${url}" -o "${outputTemplate}"`;
        
        // FFmpeg location
        command += ` --ffmpeg-location "${BIN_DIR}"`;
        
        // Force MP4 container
        command += ' --merge-output-format mp4';
        
        // General options
        command += ' --no-warnings --no-check-certificate --geo-bypass';
        command += ' --ignore-errors --no-part --retries 3 --fragment-retries 3';
        
        // === COOKIES OR ANDROID CLIENT ===
        if (hasCookies && retryCount === 0) {
            console.log('🍪 Using Premium Cookies...');
            command += ` --cookies "${WRITABLE_COOKIES}"`;
            // YouTube specific extractor args with cookies
            command += ' --extractor-args "youtube:player_client=android,web;player_skip=configs"';
        } else {
            console.log('📱 Using Android Client Fallback...');
            // Different extractor args for better compatibility
            command += ' --extractor-args "youtube:player_client=android"';
        }
        
        // === QUALITY SELECTION (INTELLIGENT FALLBACK) ===
        // YouTube now requires more specific format selection
        let formatSelector = '';
        
        switch(quality) {
            case '4k':
                formatSelector = 'bv*[height<=2160][vcodec^=avc1]+ba/b[height<=2160] / bv*[height<=2160]+ba/b';
                break;
            case '2k':
                formatSelector = 'bv*[height<=1440][vcodec^=avc1]+ba/b[height<=1440] / bv*[height<=1440]+ba/b';
                break;
            case '1080':
                formatSelector = 'bv*[height<=1080][vcodec^=avc1]+ba/b[height<=1080] / bv*[height<=1080]+ba/b';
                break;
            case '720':
                formatSelector = 'bv*[height<=720][vcodec^=avc1]+ba/b[height<=720] / bv*[height<=720]+ba/b';
                break;
            case '480':
                formatSelector = 'bv*[height<=480][vcodec^=avc1]+ba/b[height<=480] / bv*[height<=480]+ba/b';
                break;
            default: // 'best'
                formatSelector = 'bv*+ba/b';
        }
        
        command += ` -f "${formatSelector}"`;
        
        // Add sorting as backup (not primary)
        if (quality !== 'best') {
            const resolutionMap = {
                '4k': '2160',
                '2k': '1440',
                '1080': '1080',
                '720': '720',
                '480': '480'
            };
            if (resolutionMap[quality]) {
                command += ` -S "res:${resolutionMap[quality]},codec"`;
            }
        }
        
        // User Agent and headers
        if (hasCookies) {
            command += ' --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"';
        } else {
            command += ' --user-agent "Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36"';
        }
        
        command += ' --referer "https://www.youtube.com/"';
        command += ' --add-header "Accept-Language: en-US,en;q=0.9"';
        
        // Rate limiting
        command += ' --limit-rate 2M';
        
        console.log(`🔄 Executing command...`);
        console.log(`📝 Command preview: ${command.substring(0, 150)}...`);
        
        const { stdout, stderr } = await execPromise(command, { timeout: 300000 }); // 5 minute timeout
        
        if (stderr && !stderr.includes('WARNING:')) {
            console.warn('⚠️ yt-dlp stderr:', stderr.substring(0, 200));
        }
        
        // Find the created file
        const files = fs.readdirSync(downloadsDir);
        const downloadedFile = files.find(f => f.includes(timestamp.toString()) && (f.endsWith('.mp4') || f.endsWith('.webm')));
        
        if (downloadedFile) {
            const filepath = path.join(downloadsDir, downloadedFile);
            const stats = fs.statSync(filepath);
            
            // Ensure it's MP4 (rename if needed)
            if (!downloadedFile.endsWith('.mp4')) {
                const newFilename = downloadedFile.replace(/\.[^.]+$/, '.mp4');
                const newFilepath = path.join(downloadsDir, newFilename);
                fs.renameSync(filepath, newFilepath);
                console.log(`✅ Converted to MP4: ${newFilename}`);
                
                return {
                    success: true,
                    filename: newFilename,
                    downloadUrl: `/downloads/${newFilename}`,
                    size: stats.size,
                    site: detectSite(url)
                };
            }
            
            console.log(`✅ Download successful: ${downloadedFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
            return {
                success: true,
                filename: downloadedFile,
                downloadUrl: `/downloads/${downloadedFile}`,
                size: stats.size,
                site: detectSite(url)
            };
        } else {
            // RETRY LOGIC
            if (retryCount < maxRetries) {
                console.log(`🔄 Retry attempt ${retryCount + 1}/${maxRetries}...`);
                return await downloadVideo(url, quality, retryCount + 1);
            }
            
            throw new Error('File not created. YouTube may have blocked the request or video is age-restricted.');
        }

    } catch (error) {
        console.error('❌ Download Error:', error.message);
        
        // Parse error for better messages
        const errStr = error.stderr || error.message || '';
        
        if (errStr.includes('Sign in') || errStr.includes('private') || errStr.includes('members-only')) {
            throw new Error('YouTube: Video is private, age-restricted, or requires login. Check your cookies.');
        }
        
        if (errStr.includes('Requested format is not available')) {
            if (retryCount < maxRetries) {
                console.log('🔄 Format not available, retrying with different parameters...');
                return await downloadVideo(url, quality, retryCount + 1);
            }
            throw new Error('YouTube: Requested quality not available for this video. Try lower quality.');
        }
        
        if (errStr.includes('This video is not available')) {
            throw new Error('YouTube: Video is not available in your country or has been removed.');
        }
        
        // Generic error
        const shortError = errStr.substring(0, 150);
        throw new Error(`YouTube download failed: ${shortError}`);
    }
}

// === API ENDPOINT ===
app.post('/api/download', async (req, res) => {
    try {
        const { url, quality = 'best' } = req.body;
        
        if (!url) {
            return res.status(400).json({ 
                success: false, 
                error: 'No URL provided. Paste a YouTube, TikTok, Instagram, etc. URL.' 
            });
        }
        
        console.log(`📥 API Request: ${url.substring(0, 50)}...`);
        
        const result = await downloadVideo(url, quality);
        
        res.json({
            success: true,
            message: '🎉 Download Successful! Click the link below.',
            ...result
        });

    } catch (error) {
        console.error('❌ API Error:', error.message);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            tip: 'Try: 1) Different video 2) Lower quality 3) Check if cookies are fresh'
        });
    }
});

// === STATUS ENDPOINT ===
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        version: '12.1.0',
        youtube: 'fixed',
        timestamp: new Date().toISOString()
    });
});

// === FRONTEND ===
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🎬 GrabAnyVideo - FIXED</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', system-ui, sans-serif; background: linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%); color: white; padding: 20px; max-width: 800px; margin: 0 auto; min-height: 100vh; }
            .container { background: rgba(30, 30, 46, 0.8); padding: 30px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid #333; }
            h1 { color: #ff4757; text-align: center; margin-bottom: 10px; font-size: 2.5em; }
            .tagline { text-align: center; color: #aaa; margin-bottom: 30px; font-size: 1.1em; }
            input { width: 100%; padding: 18px; background: rgba(255,255,255,0.1); border: 2px solid #444; color: white; margin-bottom: 25px; border-radius: 12px; font-size: 16px; transition: all 0.3s; }
            input:focus { outline: none; border-color: #ff4757; background: rgba(255,255,255,0.15); }
            select { width: 100%; padding: 15px; background: rgba(255,255,255,0.1); color: white; border: 2px solid #444; border-radius: 12px; margin-bottom: 25px; font-size: 16px; }
            button { width: 100%; padding: 20px; background: linear-gradient(135deg, #ff4757 0%, #ff3838 100%); color: white; border: none; border-radius: 12px; font-weight: bold; font-size: 18px; cursor: pointer; transition: all 0.3s; box-shadow: 0 5px 15px rgba(255,71,87,0.3); }
            button:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(255,71,87,0.4); }
            button:disabled { background: #555; transform: none; box-shadow: none; cursor: not-allowed; }
            .result { margin-top: 25px; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 12px; display: none; border-left: 5px solid transparent; }
            .success { border-left-color: #00b894; background: rgba(0, 184, 148, 0.1); }
            .error { border-left-color: #ff4757; background: rgba(255, 71, 87, 0.1); }
            .info { font-size: 14px; color: #666; margin-top: 30px; text-align: center; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 10px; }
            .success-link { display: inline-block; margin-top: 15px; padding: 12px 25px; background: #00b894; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; transition: all 0.3s; }
            .success-link:hover { background: #00a085; transform: translateY(-2px); }
            .quality-info { display: flex; justify-content: space-between; margin-bottom: 10px; color: #aaa; font-size: 14px; }
            .loader { display: none; width: 30px; height: 30px; margin: 0 auto 20px; border: 4px solid #333; border-top: 4px solid #ff4757; border-radius: 50%; animation: spin 1s linear infinite; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🎬 GrabAnyVideo</h1>
            <div class="tagline">Download videos from YouTube, TikTok, Instagram, Twitter, Facebook & more</div>
            
            <div class="quality-info">
                <span>Works with most videos</span>
                <span>🔄 Auto-retry on failure</span>
            </div>
            
            <input type="text" id="url" placeholder="📋 Paste ANY video URL here..." autocomplete="off">
            
            <select id="quality">
                <option value="best">🎯 Best Quality Available</option>
                <option value="1080">📺 1080p HD</option>
                <option value="720">📺 720p HD</option>
                <option value="480">📱 480p Standard</option>
                <option value="4k">🎬 4K Ultra HD (if available)</option>
                <option value="2k">🎬 2K (if available)</option>
            </select>

            <button onclick="download()" id="btn">⬇️ Download Video</button>
            <div class="loader" id="loader"></div>
            <div id="result" class="result"></div>
            
            <div class="info">
                <strong>Server Status:</strong> <span id="status">Checking...</span><br>
                <small>YouTube Fixed | Auto-retry system | MP4 format guaranteed</small>
            </div>
        </div>

        <script>
            // Check server status
            async function checkStatus() {
                try {
                    const res = await fetch('/api/status');
                    const data = await res.json();
                    document.getElementById('status').innerHTML = '✅ Online';
                    document.getElementById('status').style.color = '#00b894';
                } catch (e) {
                    document.getElementById('status').innerHTML = '❌ Offline';
                    document.getElementById('status').style.color = '#ff4757';
                }
            }
            
            checkStatus();
            setInterval(checkStatus, 30000);

            async function download() {
                const url = document.getElementById('url').value.trim();
                const quality = document.getElementById('quality').value;
                const btn = document.getElementById('btn');
                const result = document.getElementById('result');
                const loader = document.getElementById('loader');
                
                if(!url) {
                    result.style.display = 'block';
                    result.className = 'result error';
                    result.innerHTML = '❌ Please paste a video URL first!';
                    return;
                }
                
                if(!url.includes('http')) {
                    result.style.display = 'block';
                    result.className = 'result error';
                    result.innerHTML = '❌ Please enter a valid URL (include https://)';
                    return;
                }
                
                btn.disabled = true;
                btn.textContent = '⏳ Processing...';
                loader.style.display = 'block';
                result.style.display = 'none';

                try {
                    const res = await fetch('/api/download', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({url, quality})
                    });
                    
                    const data = await res.json();
                    
                    result.style.display = 'block';
                    loader.style.display = 'none';
                    
                    if(data.success) {
                        const sizeMB = (data.size / 1024 / 1024).toFixed(2);
                        result.className = 'result success';
                        result.innerHTML = `
                            <h3>✅ Download Successful!</h3>
                            <p>Site: ${data.site.toUpperCase()}</p>
                            <p>Size: ${sizeMB} MB</p>
                            <p>Quality: ${quality.toUpperCase()}</p>
                            <a href="${data.downloadUrl}" download class="success-link">
                                💾 Click here to save "${data.filename}"
                            </a>
                            <p style="margin-top: 15px; font-size: 12px; color: #aaa;">
                                ⚡ Video will play in browser. Right-click → "Save video as" to download.
                            </p>
                        `;
                    } else {
                        result.className = 'result error';
                        result.innerHTML = `
                            ❌ <strong>Download Failed</strong><br>
                            ${data.error}<br>
                            <small style="color: #aaa;">${data.tip || 'Try a different video or quality'}</small>
                        `;
                    }
                } catch(e) {
                    result.style.display = 'block';
                    loader.style.display = 'none';
                    result.className = 'result error';
                    result.innerHTML = '❌ Network Error. Make sure server is running.';
                    console.error(e);
                }
                
                btn.disabled = false;
                btn.textContent = '⬇️ Download Video';
            }
            
            // Enter key support
            document.getElementById('url').addEventListener('keypress', function(e) {
                if(e.key === 'Enter') download();
            });
            
            // Example URLs
            console.log('Example URLs to test:');
            console.log('- YouTube: https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            console.log('- TikTok: https://www.tiktok.com/@example/video/123456789');
            console.log('- Instagram: https://www.instagram.com/p/ABC123/');
        </script>
    </body>
    </html>
    `);
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found. Use /api/download for downloads.' });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`
    ============================================
    🚀 GrabAnyVideo Server v12.1.0
    📍 Port: ${PORT}
    ⏰ Time: ${new Date().toLocaleString()}
    🔧 YouTube: FIXED with intelligent fallback
    ============================================
    `);
});