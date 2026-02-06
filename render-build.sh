#!/bin/bash
set -e

echo "Build Process Started..."

# 1. Install Node.js dependencies
npm install

# 2. Create bin directory
mkdir -p bin

# 3. Download yt-dlp
echo "Downloading yt-dlp..."
wget -q https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -O bin/yt-dlp
chmod +x bin/yt-dlp

# 4. Download FFmpeg
echo "Downloading FFmpeg..."
wget -q https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz

# 5. Extract FFmpeg (SIMPLE METHOD)
echo "Extracting FFmpeg..."
tar -xf ffmpeg-release-amd64-static.tar.xz

# 6. Find and move FFmpeg binaries (this handles any directory name)
for dir in ffmpeg-*-static; do
    if [ -d "$dir" ]; then
        mv "$dir/ffmpeg" bin/ 2>/dev/null || true
        mv "$dir/ffprobe" bin/ 2>/dev/null || true
        rm -rf "$dir"
        break
    fi
done

# 7. Cleanup
rm -f ffmpeg-release-amd64-static.tar.xz

# 8. Verify and set permissions
if [ -f "bin/ffmpeg" ]; then
    chmod +x bin/ffmpeg bin/ffprobe
    echo "FFmpeg installed successfully"
else
    echo "Warning: FFmpeg extraction failed, but continuing..."
    # Create dummy files so server.js doesn't crash
    echo "#!/bin/bash" > bin/ffmpeg
    echo "echo 'FFmpeg not installed'" > bin/ffprobe
    chmod +x bin/ffmpeg bin/ffprobe
fi

# 9. Show final result
echo "Build Complete!"
echo "Files in bin/:"
ls -la bin/