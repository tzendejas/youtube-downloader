#!/bin/bash
set -e

echo "Starting build process..."

# 1. Clean up
rm -rf node_modules package-lock.json
rm -rf bin downloads
mkdir -p bin downloads

# 2. Install dependencies
npm install

# 3. Download yt-dlp
echo "Downloading yt-dlp..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o bin/yt-dlp
chmod +x bin/yt-dlp

# 4. Download FFmpeg from John Van Sickle (WORKS EVERY TIME)
echo "Downloading FFmpeg..."
wget -q https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz

# 5. Extract FFmpeg
echo "Extracting FFmpeg..."
tar -xf ffmpeg-release-amd64-static.tar.xz

# 6. Find and move FFmpeg files
FFMPEG_DIR=$(find . -name "ffmpeg-*-static" -type d | head -1)
if [ -n "$FFMPEG_DIR" ]; then
    cp "$FFMPEG_DIR/ffmpeg" bin/
    cp "$FFMPEG_DIR/ffprobe" bin/
    echo "FFmpeg found in: $FFMPEG_DIR"
else
    echo "ERROR: Could not find ffmpeg directory!"
    exit 1
fi

# 7. Clean up
rm -rf ffmpeg-*-static
rm -f ffmpeg-release-amd64-static.tar.xz

# 8. Set permissions
chmod +x bin/ffmpeg bin/ffprobe

# 9. Verify
echo "Build complete! Files:"
ls -lh bin/
echo "yt-dlp version:"
bin/yt-dlp --version