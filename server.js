// 🎬 GRABANYVIDEO - ENHANCED YOUTUBE VERSION
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

// === ENHANCED UNIVERSAL DOWNLOADER ===
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
            console.log('🎬 YouTube detected - trying multiple methods...');
            
            // === METHOD 1: Try Android client first (works for most videos)
            let ytCommand = command;
            
            // Quality selection for YouTube
            if (quality === 'best') {
                ytCommand += ' -f "best[height<=720]"';
            } else if (quality === '1080') {
                ytCommand += ' -f "best[height<=1080]"';
            } else if (quality === '720') {
                ytCommand += ' -f "best[height<=720]"';
            } else if (quality === '480') {
                ytCommand += ' -f "best[height<=480]"';
            }
            
            // Method 1: Android client (best success rate)
            ytCommand += ' --extractor-args "youtube:player_client=android"';
            ytCommand += ' --user-agent "Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36"';
            ytCommand += ' --referer "https://www.youtube.com/"';
            
            // Common options
            ytCommand += ' --no-warnings --no-check-certificate --geo-bypass';
            ytCommand += ' --merge-output-format mp4';
            ytCommand += ' --ignore-errors --retries 3';
            
            console.log(`🔄 Trying Method 1 (Android)...`);
            
            try {
                await execPromise(ytCommand, { timeout: 300000 });
                
                if (fs.existsSync(outputPath)) {
                    const stats = fs.statSync(outputPath);
                    const filename = `video-${timestamp}.mp4`;
                    
                    console.log(`✅ YouTube Method 1 successful: ${filename}`);
                    return {
                        success: true,
                        filename: filename,
                        downloadUrl: `/downloads/${filename}`,
                        size: stats.size
                    };
                }
            } catch (method1Error) {
                console.log('⚠️ Method 1 failed, trying Method 2...');
                
                // === METHOD 2: Try Web client with different options
                let ytCommand2 = command;
                
                // Try simpler format
                ytCommand2 += ' -f "best"'; // Let yt-dlp choose
                
                // Method 2: Web client with cookies bypass
                ytCommand2 += ' --extractor-args "youtube:player_client=web"';
                ytCommand2 += ' --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"';
                ytCommand2 += ' --referer "https://www.youtube.com/"';
                ytCommand2 += ' --throttled-rate 50K';
                ytCommand2 += ' --sleep-requests 1';
                
                // Common options
                ytCommand2 += ' --no-warnings --no-check-certificate --geo-bypass';
                ytCommand2 += ' --merge-output-format mp4';
                ytCommand2 += ' --ignore-errors';
                
                try {
                    await execPromise(ytCommand2, { timeout: 300000 });
                    
                    if (fs.existsSync(outputPath)) {
                        const stats = fs.statSync(outputPath);
                        const filename = `video-${timestamp}.mp4`;
                        
                        console.log(`✅ YouTube Method 2 successful: ${filename}`);
                        return {
                            success: true,
                            filename: filename,
                            downloadUrl: `/downloads/${filename}`,
                            size: stats.size
                        };
                    }
                } catch (method2Error) {
                    console.log('⚠️ Method 2 failed, trying Method 3...');
                    
                    // === METHOD 3: Try with embed URL (bypasses some restrictions)
                    if (url.includes('youtube.com/watch?v=')) {
                        const videoId = url.split('v=')[1].split('&')[0];
                        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
                        
                        console.log(`🔄 Trying embed URL: ${embedUrl}`);
                        
                        let ytCommand3 = `"${YTDLP_PATH}" "${embedUrl}" -o "${outputPath}"`;
                        ytCommand3 += ' -f "best"';
                        ytCommand3 += ' --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"';
                        ytCommand3 += ' --referer "https://www.youtube.com/"';
                        ytCommand3 += ' --no-warnings --no-check-certificate --geo-bypass';
                        ytCommand3 += ' --merge-output-format mp4';
                        
                        try {
                            await execPromise(ytCommand3, { timeout: 300000 });
                            
                            if (fs.existsSync(outputPath)) {
                                const stats = fs.statSync(outputPath);
                                const filename = `video-${timestamp}.mp4`;
                                
                                console.log(`✅ YouTube Method 3 (embed) successful: ${filename}`);
                                return {
                                    success: true,
                                    filename: filename,
                                    downloadUrl: `/downloads/${filename}`,
                                    size: stats.size
                                };
                            }
                        } catch (method3Error) {
                            console.log('❌ All YouTube methods failed');
                        }
                    }
                }
            }
            
            // All methods failed
            const errMsg = method1Error?.stderr || method2Error?.stderr || 'YouTube download failed';
            
            if (errMsg.includes('age-restricted') || errMsg.includes('Sign in')) {
                throw new Error('This YouTube video requires login or is restricted. Try a different public video.');
            } else if (errMsg.includes('geo-restricted')) {
                throw new Error('This YouTube video is not available in your region.');
            } else if (errMsg.includes('copyright')) {
                throw new Error('This YouTube video has copyright restrictions.');
            } else {
                throw new Error('YouTube video cannot be downloaded. Try a different video.');
            }
            
        } else {
            // === NON-YOUTUBE SITES ===
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
            command += ' --no-warnings --no-check-certificate --geo-bypass';
            command += ' --merge-output-format mp4';
            
            console.log(`🔄 Executing...`);
            
            await execPromise(command, { timeout: 300000 });
            
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
        }

    } catch (error) {
        console.error('Download Error:', error.message);
        throw new Error(error.message);
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
        let userMessage = error.message;
        let tip = '';
        
        if (error.message.includes('YouTube')) {
            tip = 'Try: 1) Different YouTube video 2) Check if video is public 3) Some videos cannot be downloaded';
        } else if (error.message.includes('requires login')) {
            tip = 'This video is private, age-restricted, or members-only. Cannot download without login.';
        } else if (error.message.includes('copyright')) {
            tip = 'Video has copyright claims. Try a different video.';
        } else if (error.message.includes('region')) {
            tip = 'Video is geo-blocked. Try with VPN or different video.';
        }
        
        res.status(500).json({ 
            success: false, 
            error: userMessage,
            tip: tip
        });
    }
});

// === FRONTEND ===
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🎬 GrabAnyVideo - Enhanced</title>
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
            .info { font-size: 12px; color: #666; margin-top: 20px; text-align: center; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px; }
            .video-types { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
            .video-type { padding: 10px; background: #222; border-radius: 6px; text-align: center; }
            .video-type.good { border-left: 4px solid #0f0; }
            .video-type.bad { border-left: 4px solid #f00; }
        </style>
    </head>
    <body>
        <h1>🎬 GrabAnyVideo</h1>
        <p>Enhanced Video Downloader with Smart YouTube Detection</p>
        
        <input type="text" id="url" placeholder="🔗 Paste ANY video URL here...">
        
        <select id="quality">
            <option value="best">🎯 Best Quality Available</option>
            <option value="1080">📺 1080p</option>
            <option value="720">📺 720p (Recommended)</option>
            <option value="480">📱 480p</option>
        </select>

        <button onclick="download()" id="btn">⬇️ Download Video</button>
        <div id="result" class="result"></div>
        
        <div class="info">
            <div class="video-types">
                <div class="video-type good">
                    <strong>✅ WILL WORK:</strong><br>
                    • Public YouTube videos<br>
                    • Twitter/X videos<br>
                    • TikTok videos<br>
                    • Instagram videos
                </div>
                <div class="video-type bad">
                    <strong>❌ WON'T WORK:</strong><br>
                    • Age-restricted YouTube<br>
                    • Private YouTube videos<br>
                    • Members-only content<br>
                    • Copyright-blocked
                </div>
            </div>
            <p><strong>YouTube:</strong> Tries 3 different methods automatically</p>
            <p><strong>Other sites:</strong> Direct downloads work perfectly</p>
        </div>

        <script>
            async function download() {
                const url = document.getElementById('url').value.trim();
                const quality = document.getElementById('quality').value;
                const btn = document.getElementById('btn');
                const result = document.getElementById('result');
                
                if(!url) {
                    showResult('❌ Please paste a video URL first!', 'error');
                    return;
                }
                
                btn.disabled = true;
                btn.textContent = '⏳ Processing (may take 30 seconds)...';
                result.style.display = 'none';

                try {
                    const res = await fetch('/api/download', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({url, quality})
                    });
                    
                    const data = await res.json();
                    
                    if(data.success) {
                        showResult(
                            '✅ <b>Download Ready!</b><br><br>' +
                            '📁 <strong>File:</strong> ' + data.filename + '<br>' +
                            '💾 <strong>Size:</strong> ' + formatBytes(data.size) + '<br><br>' +
                            '<a href="' + data.downloadUrl + '" download style="color:#0f0;font-weight:bold;font-size:16px;text-decoration:none;padding:10px 20px;background:#0f0;color:black;border-radius:6px;">📥 CLICK TO DOWNLOAD</a>',
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
                    showResult('❌ Network error. Try again.', 'error');
                }
                
                btn.disabled = false;
                btn.textContent = '⬇️ Download Video';
            }
            
            function showResult(message, type) {
                const result = document.getElementById('result');
                result.innerHTML = message;
                result.className = 'result ' + type;
                result.style.display = 'block';
                result.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
            function formatBytes(bytes) {
                if (!bytes) return 'Unknown';
                const mb = bytes / 1024 / 1024;
                return mb.toFixed(1) + ' MB';
            }
            
            document.getElementById('url').addEventListener('keypress', function(e) {
                if(e.key === 'Enter') download();
            });
            
            // Auto-focus
            document.getElementById('url').focus();
        </script>
    </body>
    </html>
    `);
});

app.listen(PORT, () => console.log(`✅ Enhanced server running on ${PORT}`));