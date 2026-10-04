#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

export PATH="$DIR/.tools/bin:$PATH"

echo "=========================================================="
echo " 🌐 Launching Customer Feedback Analyzer (Online Public Mode)"
echo "=========================================================="

# Activate virtualenv
if [ -d "$DIR/venv" ]; then
    source "$DIR/venv/bin/activate"
fi

# Cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down server and public tunnel..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 1. Start FastAPI backend in background
echo "Starting backend server on port 8000..."
uvicorn backend.main:app --host 0.0.0.0 --port 8000 &
UVICORN_PID=$!

# Wait 2 seconds for server to initialize
sleep 2

echo ""
echo "=========================================================="
echo " 🚀 Generating your Public Online URL (like in your screenshot)..."
echo " You can open this link on ANY device, phone, or computer anywhere!"
echo "=========================================================="
echo ""

# 2. Run localtunnel to give public .loca.lt URL
npx localtunnel --port 8000
