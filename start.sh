#!/usr/bin/env bash
set -e

# Customer Feedback Analyzer Startup Script
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "=========================================================="
echo " Starting Customer Feedback Analyzer (Sentix AI)"
echo " Backend: FastAPI + SQLAlchemy (SQLite / MySQL)"
echo " Frontend: React + TypeScript + Recharts + Tailwind CSS"
echo " AI: Claude 3.5 Sonnet API + Sentiment Intelligence Engine"
echo "=========================================================="

# Activate virtualenv if present
if [ -d "$DIR/venv" ]; then
    source "$DIR/venv/bin/activate"
fi

# Run the FastAPI server on port 8000
echo ""
echo "Server running at: http://localhost:8000"
echo "API Docs available at: http://localhost:8000/docs"
echo ""
exec uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
