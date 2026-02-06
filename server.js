// 🎬 GRABANYVIDEO - COMPLETE COOKIE-ENABLED VERSION
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
            console.log('🍪 Checking YouTube cookies...');
            
            // Read cookie file
            const cookieContent = fs.readFileSync(SECRET_COOKIES, 'utf8');
            
            // Check if it's valid Netscape format
            if (!cookieContent.includes('\t')) {
                console.error('❌ Cookie file uses spaces, not tabs!');
                return false;
            }
            
            // Check for essential cookies
            const hasEssentialCookies = 
                cookieContent.includes('__Secure-1PSID') &&
                cookieContent.includes('__Secure-3PSID') &&
                cookieContent.includes('LOGIN_INFO');
            
            if (!hasEssentialCookies) {
                console.error('❌ Missing essential YouTube cookies');
                return false;
            }
            
            // Write to writable location
            fs.writeFileSync(WRITABLE_COOKIES, cookieContent);
            fs.chmodSync(WRITABLE_COOKIES, 0o600);
            console.log('✅ YouTube cookies loaded successfully');
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

// === ENHANCED DOWNLOADER WITH COOKIE SUPPORT ===
async function downloadVideo(url, quality = 'best') {
    try {
        console.log(`🎬 Processing: ${url}`);
        
        const timestamp = Date.now();
        const outputPath = path.join(downloadsDir, `video-${timestamp}.mp4`);
        const siteType = detectSite(url);
        
        // Build command
        let command = `"${YTDLP_PATH}" "${url}" -o "${outputPath}"`;
        
        // === YOUTUBE WITH COOKIE SUPPORT ===
        if (siteType === 'youtube') {
            console.log('🎬 YouTube detected');
            
            // Setup cookies
            let useCookies = false;
            const hasCookies = setupYouTubeCookies();
            
            if (hasCookies && fs.existsSync(WRITABLE_COOKIES)) {
                console.log('🍪 Using YouTube cookies for authentication');
                command += ` --cookies "${WRITABLE_COOKIES}"`;
                useCookies = true;
            } else {
                console.log('📱 No cookies available, using Android fallback');
                command += ' --extractor-args "youtube:player_client=android"';
                command += ' --throttled-rate 100K';
            }
            
            // Quality selection for YouTube
            if (quality === 'best') {
                command += ' -f "bestvideo[height<=1080]+bestaudio/best"';
            } else if (quality === '1080') {
                command += ' -f "bestvideo[height<=1080]+bestaudio/best[height<=1080]"';
            } else if (quality === '720') {
                command += ' -f "bestvideo[height<=720]+bestaudio/best[height<=720]"';
            } else if (quality === '480') {
                command += ' -f "bestvideo[height<=480]+bestaudio/best[height<=480]"';
            }
            
            // Headers based on whether we have cookies
            if (useCookies) {
                // With cookies, use desktop browser
                command += ' --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"';
            } else {
                // Without cookies, use Android
                command += ' --user-agent "Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36"';
            }
            
            command += ' --referer "https://www.youtube.com/"';
            
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
            
            // Standard user agent for other sites
            command += ' --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"';
        }
        
        // Common options for ALL sites
        command += ' --no-warnings --no-check-certificate --geo-bypass';
        command += ' --merge-output-format mp4';
        command += ' --ignore-errors --retries 2';
        
        console.log(`🔄 Executing...`);
        console.log(`Command preview: ${command.substring(0, 150)}...`);
        
        const { stdout, stderr } = await execPromise(command, { timeout: 300000 });
        
        if (stderr && stderr.includes('WARNING')) {
            console.warn('⚠️ Warnings:', stderr.substring(0, 200));
        }
        
        // Check if file was created
        if (fs.existsSync(outputPath)) {
            const stats = fs.statSync(outputPath);
            const filename = `video-${timestamp}.mp4`;
            
            console.log(`✅ Downloaded: ${filename} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
            
            return {
                success: true,
                filename: filename,
                downloadUrl: `/downloads/${filename}`,
                size: stats.size,
                site: siteType
            };
        } else {
            // Fallback: look for any new file
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
                    site: siteType
                };
            }
            
            throw new Error('File not created after download');
        }

    } catch (error) {
        console.error('Download Error:', error.message);
        
        const errStr = error.stderr || error.message || '';
        
        // Handle specific errors
        if (errStr.includes('does not look like a Netscape format')) {
            throw new Error('YouTube cookies invalid format. Need fresh cookies with tabs.');
        }
        
        if (errStr.includes('Sign in to confirm')) {
            throw new Error('YouTube blocked. Cookies expired or video requires login.');
        }
        
        if (errStr.includes('age-restricted')) {
            throw new Error('YouTube: Age-restricted video. Need logged-in cookies.');
        }
        
        if (errStr.includes('private')) {
            throw new Error('YouTube: Private video. Cannot download.');
        }
        
        if (errStr.includes('members-only')) {
            throw new Error('YouTube: Members-only video. Need membership.');
        }
        
        if (errStr.includes('Requested format is not available')) {
            throw new Error('Quality not available. Try "Best Quality".');
        }
        
        // Generic error
        throw new Error(`Download failed: ${errStr.substring(0, 150)}`);
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
            message: '✅ Download Successful!',
            ...result
        });

    } catch (error) {
        console.error('API Error:', error.message);
        
        let userMessage = error.message;
        let tip = '';
        
        if (error.message.includes('YouTube')) {
            if (error.message.includes('cookies') || error.message.includes('expired')) {
                tip = 'Get fresh YouTube cookies from a logged-in browser session.';
            } else if (error.message.includes('Age-restricted')) {
                tip = 'Age-restricted videos need logged-in cookies. Get fresh cookies.';
            } else if (error.message.includes('Quality not available')) {
                tip = 'Try selecting "Best Quality" instead of specific resolution.';
            } else {
                tip = 'For YouTube: 1) Get fresh cookies 2) Try "Best Quality" 3) Try different video';
            }
        } else if (error.message.includes('cookies invalid')) {
            tip = 'Update your cookie file in Render secrets with fresh cookies.';
        }
        
        res.status(500).json({ 
            success: false, 
            error: userMessage,
            tip: tip || 'Try a different video or URL'
        });
    }
});

// === FRONTEND ===
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🎬 GrabAnyVideo - Cookie Enabled</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { font-family: sans-serif; background: #111; color: white; padding: 20px; max-width: 800px; margin: 0 auto; }
            .container { max-width: 800px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            h1 { color: #ff0000; font-size: 42px; margin-bottom: 10px; }
            .subtitle { color: #ccc; font-size: 18px; margin-bottom: 30px; }
            .cookie-status { 
                padding: 10px; 
                border-radius: 8px; 
                margin: 20px 0; 
                text-align: center;
                font-weight: bold;
            }
            .cookies-ok { background: rgba(0,255,0,0.2); border: 2px solid #0f0; }
            .cookies-missing { background: rgba(255,165,0,0.2); border: 2px solid #ff9900; }
            .main-card { background: rgba(255,255,255,0.05); padding: 30px; border-radius: 20px; margin-bottom: 25px; border: 1px solid #333; }
            input { width: 100%; padding: 18px; background: #222; border: 2px solid #444; color: white; border-radius: 12px; font-size: 16px; margin-bottom: 20px; }
            select { width: 100%; padding: 15px; background: #222; color: white; border: 2px solid #444; border-radius: 12px; margin-bottom: 25px; font-size: 16px; }
            button { width: 100%; padding: 20px; background: linear-gradient(135deg, #ff0000, #cc0000); color: white; border: none; border-radius: 12px; font-size: 20px; font-weight: bold; cursor: pointer; }
            button:disabled { opacity: 0.6; cursor: not-allowed; }
            .result { margin-top: 25px; padding: 25px; background: rgba(255,255,255,0.05); border-radius: 15px; display: none; border-left: 5px solid #444; }
            .success { border-left-color: #00ff00; }
            .error { border-left-color: #ff0000; }
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
            .info-grid { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 15px; 
                margin: 30px 0; 
            }
            .info-card { 
                padding: 20px; 
                background: #222; 
                border-radius: 12px; 
                border-left: 4px solid; 
            }
            .info-good { border-left-color: #00ff00; }
            .info-warning { border-left-color: #ff9900; }
            .info-title { color: #ff0000; margin-bottom: 10px; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎬 GrabAnyVideo</h1>
                <div class="subtitle">Cookie-Enabled Version - Download Age-Restricted YouTube Videos</div>
                
                <div id="cookieStatus" class="cookie-status cookies-missing">
                    🔍 Checking cookie status...
                </div>
            </div>
            
            <div class="main-card">
                <input type="text" id="url" placeholder="🔗 Paste ANY video URL here..." autocomplete="off">
                
                <select id="quality">
                    <option value="best">🎯 Best Quality Available</option>
                    <option value="1080">📺 1080p HD</option>
                    <option value="720">📺 720p HD</option>
                    <option value="480">📱 480p</option>
                </select>
                
                <button onclick="download()" id="btn">⬇️ DOWNLOAD VIDEO NOW</button>
                
                <div id="result" class="result"></div>
            </div>
            
            <div class="info-grid">
                <div class="info-card info-good">
                    <div class="info-title">✅ WITH COOKIES:</div>
                    <div>• Age-restricted YouTube</div>
                    <div>• Private videos (if you have access)</div>
                    <div>• Members-only (if you're a member)</div>
                    <div>• All public YouTube videos</div>
                </div>
                <div class="info-card info-warning">
                    <div class="info-title">⚠️ GET FRESH COOKIES:</div>
                    <div>1. Log into YouTube in Chrome</div>
                    <div>2. Install "Get cookies.txt LOCALLY" extension</div>
                    <div>3. Export cookies for .youtube.com</div>
                    <div>4. Update Render secrets file</div>
                </div>
            </div>
            
            <div class="info-card">
                <div class="info-title">🌐 ALL PLATFORMS SUPPORTED:</div>
                <div><strong>✅ Working:</strong> YouTube (with cookies), Twitter/X, TikTok, Instagram, Facebook, Vimeo, Twitch, Dailymotion, Reddit, LinkedIn, Zoom/Meets, Rumble, Bitchute, Odysee</div>
            </div>
        </div>

        <script>
            // Check cookie status
            async function checkCookieStatus() {
                try {
                    const res = await fetch('/api/cookie-status');
                    const data = await res.json();
                    
                    const statusDiv = document.getElementById('cookieStatus');
                    if (data.hasCookies) {
                        statusDiv.className = 'cookie-status cookies-ok';
                        statusDiv.innerHTML = '✅ YouTube Cookies: LOADED & READY';
                    } else {
                        statusDiv.className = 'cookie-status cookies-missing';
                        statusDiv.innerHTML = '⚠️ YouTube Cookies: NOT FOUND (age-restricted videos won\'t work)';
                    }
                } catch (e) {
                    // Ignore if endpoint doesn't exist
                }
            }
            
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
                btn.textContent = '⏳ Processing... (Checking cookies)';
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
                        const siteBadge = data.site === 'youtube' ? '🎬 ' : '🌐 ';
                        showResult(
                            '✅ <strong style="font-size:20px;">DOWNLOAD READY!</strong><br>' +
                            siteBadge + '<strong>Platform:</strong> ' + (data.site || 'Unknown').toUpperCase() + '<br>' +
                            '📁 <strong>File:</strong> ' + data.filename + '<br>' +
                            '💾 <strong>Size:</strong> ' + sizeMB + '<br><br>' +
                            '<a href="' + data.downloadUrl + '" download class="download-link">📥 CLICK TO DOWNLOAD VIDEO</a>',
                            'success'
                        );
                    } else {
                        let errorMsg = '❌ ' + data.error;
                        if(data.tip) {
                            errorMsg += '<br><br>💡 <strong>Tip:</strong> ' + data.tip;
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
            
            // Cookie status endpoint
            app.get('/api/cookie-status', (req, res) => {
                const hasCookies = fs.existsSync(SECRET_COOKIES);
                res.json({ hasCookies: hasCookies });
            });
            
            // Enter key support
            document.getElementById('url').addEventListener('keypress', function(e) {
                if(e.key === 'Enter') download();
            });
            
            // Auto-focus and check cookies
            document.getElementById('url').focus();
            setTimeout(checkCookieStatus, 1000);
            
            console.log('🎬 GrabAnyVideo Cookie Edition loaded!');
        </script>
    </body>
    </html>
    `);
});

// Add cookie status endpoint
app.get('/api/cookie-status', (req, res) => {
    const hasCookies = fs.existsSync(SECRET_COOKIES);
    res.json({ 
        hasCookies: hasCookies,
        message: hasCookies ? 'YouTube cookies found' : 'No YouTube cookies found'
    });
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

// Clean cookie files on startup
if (fs.existsSync(WRITABLE_COOKIES)) {
    try {
        fs.unlinkSync(WRITABLE_COOKIES);
        console.log('🧹 Cleaned old cookie file');
    } catch (e) {
        // Ignore
    }
}

app.listen(PORT, () => {
    console.log(`✅ Cookie-enabled server running on ${PORT}`);
    console.log(`🍪 YouTube cookie support: ${fs.existsSync(SECRET_COOKIES) ? 'ENABLED' : 'DISABLED'}`);
});