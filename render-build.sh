#!/usr/bin/env bash
# Exit on error
set -e

echo "Build Process Started..."

# 1. CLEAN SLATE: Remove old dependencies to fix "Cannot find module" errors
echo "Cleaning old modules..."
rm -rf node_modules package-lock.json

# 2. Install Node.js dependencies (Force Fresh Install)
echo "Instanding dependencies..."
npm install

# 3. Create bin directory
mkdir -p bin

# 4. Download yt-dlp (The Video Downloader)
echo "Downloading yt-dlp..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o bin/yt-dlp
chmod a+rx bin/yt-dlp

# 5. Download FFmpeg (The Video Processor)
echo "Downloading FFmpeg..."
curl -O https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz

# 6. Extract FFmpeg
echo "Extracting FFmpeg..."
tar -xf ffmpeg-release-amd64-static.tar.xz
# Move binaries to our bin folder
mv ffmpeg-*-static/ffmpeg bin/ffmpeg
mv ffmpeg-*-static/ffprobe bin/ffprobe

# 7. Cleanup
echo "Cleaning up..."
rm -rf ffmpeg-*-static
rm ffmpeg-release-amd64-static.tar.xz

# 8. Set Permissions
chmod a+rx bin/ffmpeg bin/ffprobe

echo "Build Complete. Tools installed in ./bin"
ls -l bin/