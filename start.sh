#!/bin/bash
set -e

echo ""
echo "Starting Quantum Shield..."
echo ""

# Start backend in background
echo "[*] Starting backend on http://localhost:8000 ..."
cd backend
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
echo "[*] Waiting for backend to be ready..."
for i in $(seq 1 15); do
  if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
    echo "[OK] Backend is running."
    break
  fi
  sleep 1
done

# Start frontend
echo "[*] Starting frontend on http://localhost:5173 ..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "============================================"
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://localhost:8000"
echo ""
echo "  Press Ctrl+C to stop both servers."
echo "============================================"
echo ""

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
