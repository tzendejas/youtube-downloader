#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "Build Process Started..."

# 1. Install Node.js dependencies
npm install

# 2. Create a local bin directory to store our tools
mkdir -p bin

# 3. Download yt-dlp (Standalone Linux Binary)
# We use the _linux version which includes Python, so it works even if Render's python is old
echo "Downloading yt-dlp..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o bin/yt-dlp

# Make it executable
chmod a+rx bin/yt-dlp

# 4. Download FFmpeg (Static Build)
echo "Downloading FFmpeg..."
curl -O https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz

# Extract only ffmpeg and ffprobe to the bin folder
echo "Extracting FFmpeg..."
tar -xf ffmpeg-release-amd64-static.tar.xz --wildcards '*/ffmpeg' '*/ffprobe' --strip-components=1 -C bin/

# Clean up the zip file
rm ffmpeg-release-amd64-static.tar.xz

# Make them executable
chmod a+rx bin/ffmpeg bin/ffprobe

echo "Build Complete. Tools installed in ./bin"
ls -l bin/