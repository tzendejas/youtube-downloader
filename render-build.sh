#!/usr/bin/env bash
# Exit on error
set -e

echo "=========================================="
echo "🚀 GrabAnyVideo Build Process - ULTIMATE FIX"
echo "=========================================="

# 1. CLEAN SLATE
echo "🔧 Step 1: Cleaning old modules..."
rm -rf node_modules package-lock.json .npmrc

# 2. Install Node.js dependencies
echo "🔧 Step 2: Installing dependencies..."
npm install --production --no-optional --legacy-peer-deps

# 3. Create directories
echo "🔧 Step 3: Creating directories..."
mkdir -p bin downloads

# 4. Download yt-dlp (LATEST VERSION)
echo "🔧 Step 4: Downloading yt-dlp (Latest)..."
curl -L https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/latest/download/yt-dlp_linux -o bin/yt-dlp
chmod a+rx bin/yt-dlp

# Verify yt-dlp
echo "📦 yt-dlp version:"
bin/yt-dlp --version

# 5. Download FFmpeg (STATIC BUILD)
echo "🔧 Step 5: Downloading FFmpeg..."
FFMPEG_URL="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz"

curl -L $FFMPEG_URL -o ffmpeg.tar.xz

# 6. Extract FFmpeg
echo "🔧 Step 6: Extracting FFmpeg..."
tar -xf ffmpeg.tar.xz --strip-components=1 -C bin --wildcards '*/ffmpeg' '*/ffprobe'

# Move files to bin directory
for file in bin/ffmpeg*/*; do
    if [[ -f $file && $(basename $file) == "ffmpeg" ]] || [[ -f $file && $(basename $file) == "ffprobe" ]]; then
        mv "$file" "bin/$(basename $file)"
    fi
done

# Clean up FFmpeg directories
rm -rf bin/ffmpeg-*

# 7. Cleanup
echo "🔧 Step 7: Cleaning up..."
rm -f ffmpeg.tar.xz

# 8. Set Permissions
echo "🔧 Step 8: Setting permissions..."
chmod a+rx bin/ffmpeg bin/ffprobe bin/yt-dlp

# 9. Test binaries
echo "🔧 Step 9: Testing binaries..."
bin/ffmpeg -version | head -1
bin/ffprobe -version | head -1

# 10. Create test cookies if needed
echo "🔧 Step 10: Checking cookies..."
if [ -f "/etc/secrets/cookies.txt" ]; then
    echo "✅ Cookies found in secrets"
else
    echo "⚠️ No cookies found in secrets. YouTube may fail for age-restricted videos."
fi

echo "=========================================="
echo "✅ BUILD COMPLETE!"
echo "Tools installed in ./bin:"
ls -lh bin/
echo "=========================================="