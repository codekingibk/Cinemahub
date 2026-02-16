#!/bin/bash

# MovieBox Movie Site Setup and Run Script for Linux/macOS

echo ""
echo "========================================"
echo "   CinemaHub - MovieBox Setup"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 is not installed"
    echo "Please install Python 3.8+ from https://www.python.org"
    exit 1
fi

echo "[✓] Python found: $(python3 --version)"
echo ""

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "[*] Creating virtual environment..."
    python3 -m venv venv
    echo "[✓] Virtual environment created"
else
    echo "[✓] Virtual environment already exists"
fi

echo ""

# Activate virtual environment
echo "[*] Activating virtual environment..."
source venv/bin/activate
echo "[✓] Virtual environment activated"
echo ""

# Install dependencies
echo "[*] Installing dependencies..."
pip install -q -r requirements.txt

if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install dependencies"
    exit 1
fi

echo "[✓] Dependencies installed"
echo ""

# Run the Flask app
echo "========================================"
echo "   Starting CinemaHub Server"
echo "========================================"
echo ""
echo "[✓] Server starting on http://localhost:5000"
echo "[✓] Frontend: http://localhost:5000"
echo "[✓] API: http://localhost:5000/api"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python app.py
