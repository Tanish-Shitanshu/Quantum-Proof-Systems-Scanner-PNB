#!/bin/bash
set -e

echo ""
echo "============================================"
echo "  Quantum Shield - One-Click Setup"
echo "============================================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "[!] Node.js not found. Installing..."
    if command -v apt &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt install -y nodejs
    elif command -v brew &> /dev/null; then
        brew install node
    else
        echo "[X] Cannot auto-install Node.js. Please install it from https://nodejs.org"
        exit 1
    fi
else
    echo "[OK] Node.js found: $(node --version)"
fi

# Check for Python 3
if ! command -v python3 &> /dev/null; then
    echo "[!] Python3 not found. Installing..."
    if command -v apt &> /dev/null; then
        sudo apt install -y python3 python3-pip python3-venv
    elif command -v brew &> /dev/null; then
        brew install python3
    else
        echo "[X] Cannot auto-install Python3. Please install it from https://python.org"
        exit 1
    fi
else
    echo "[OK] Python3 found: $(python3 --version)"
fi

# Install frontend dependencies
echo ""
echo "[*] Installing frontend dependencies..."
npm install

# Set up backend
echo ""
echo "[*] Setting up backend..."
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..

echo ""
echo "============================================"
echo "  Setup complete!"
echo ""
echo "  To start the app, run:  ./start.sh"
echo "============================================"
echo ""
