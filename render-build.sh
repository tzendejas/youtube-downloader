#!/usr/bin/env bash
# Exit on error
set -e

echo "=========================================="
echo "🚀 GrabAnyVideo Build Process - SIMPLE & RELIABLE"
echo "=========================================="

# 1. CLEAN SLATE
echo "🔧 Step 1: Cleaning old modules..."
rm -rf node_modules package-lock.json

# 2. Install Node.js dependencies
echo "🔧 Step 2: Installing dependencies..."
npm install

# 3. Create directories
echo "🔧 Step 3: Creating directories..."
mkdir -p bin downloads

# 4. Download yt-dlp (STABLE VERSION)
echo "🔧 Step 4: Downloading yt-dlp..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o bin/yt-dlp
chmod +x bin/yt-dlp

# 5. Download FFmpeg (JOHN VAN SICKLE - PROVEN WORKING)
echo "🔧 Step 5: Downloading FFmpeg..."
wget -q https://johnvansickle.com/ffmpeg/builds/ffmpeg-git-amd64-static.tar.xz

# 6. Extract FFmpeg (SIMPLE METHOD)
echo "🔧 Step 6: Extracting FFmpeg..."
tar -xf ffmpeg-git-amd64-static.tar.xz
# Find and copy the binaries
find . -name "ffmpeg" -type f -exec cp {} bin/ \; 2>/dev/null
find . -name "ffprobe" -type f -exec cp {} bin/ \; 2>/dev/null

# 7. Cleanup
echo "🔧 Step 7: Cleaning up..."
rm -rf ffmpeg-git-*-static
rm -f ffmpeg-git-amd64-static.tar.xz

# 8. Verify binaries exist
echo "🔧 Step 8: Verifying binaries..."
if [ -f "bin/ffmpeg" ] && [ -f "bin/ffprobe" ]; then
    chmod +x bin/ffmpeg bin/ffprobe bin/yt-dlp
    echo "✅ Binaries found and permissions set"
else
    # Fallback: Download pre-extracted binaries
    echo "⚠️ Binaries not found, using fallback download..."
    wget -q https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz
    tar -xf ffmpeg-master-latest-linux64-gpl.tar.xz
    cp ffmpeg-master-latest-linux64-gpl/bin/ffmpeg bin/
    cp ffmpeg-master-latest-linux64-gpl/bin/ffprobe bin/
    rm -rf ffmpeg-master-latest-linux64-gpl
    rm -f ffmpeg-master-latest-linux64-gpl.tar.xz
    chmod +x bin/ffmpeg bin/ffprobe
fi

# 9. Test binaries
echo "🔧 Step 9: Testing binaries..."
echo "yt-dlp version:"
bin/yt-dlp --version
echo "ffmpeg version:"
bin/ffmpeg -version 2>/dev/null | head -1 || echo "ffmpeg test failed, but continuing..."

# 10. Check cookies
echo "🔧 Step 10: Checking cookies..."
if [ -f "/etc/secrets/cookies.txt" ]; then
    echo "✅ Cookies found in /etc/secrets/cookies.txt"
    echo "First line of cookies:"
    head -1 /etc/secrets/cookies.txt
else
    echo "⚠️ No cookies.txt found in secrets"
    echo "YouTube may fail for age-restricted videos"
fi

echo "=========================================="
echo "✅ BUILD COMPLETE!"
echo "Binaries in ./bin:"
ls -la bin/
echo "=========================================="