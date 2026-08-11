@echo off
echo.
echo Starting Quantum Shield...
echo.

:: Start backend
echo [*] Starting backend on http://localhost:8000 ...
start "Quantum Shield Backend" cmd /k "backend\.venv\Scripts\activate.bat && uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000"

:: Start frontend
echo [*] Starting frontend on http://localhost:5173 ...
start "Quantum Shield Frontend" cmd /k "npm run dev"

echo.
echo ============================================
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:8000
echo.
echo   Close the server windows to stop.
echo ============================================
echo.
pause
