#!/usr/bin/env bash
# Exit on error
set -e

echo "Build Process Started..."

# 1. Install Node.js dependencies
npm install

# 2. Create bin directory
mkdir -p bin

# 3. Download yt-dlp
echo "Downloading yt-dlp..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o bin/yt-dlp
chmod a+rx bin/yt-dlp

# 4. Download FFmpeg
echo "Downloading FFmpeg..."
curl -O https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz

# 5. Extract FFmpeg (The Safe Way)
echo "Extracting FFmpeg..."
# Extract the tar file completely
tar -xf ffmpeg-release-amd64-static.tar.xz

# Move the binaries from the extracted folder to our bin folder
# We use * wildcards because the folder name changes with versions
mv ffmpeg-*-static/ffmpeg bin/ffmpeg
mv ffmpeg-*-static/ffprobe bin/ffprobe

# 6. Cleanup
echo "Cleaning up..."
rm -rf ffmpeg-*-static
rm ffmpeg-release-amd64-static.tar.xz

# 7. Set Permissions
chmod a+rx bin/ffmpeg bin/ffprobe

echo "Build Complete. Tools installed in ./bin"
ls -l bin/