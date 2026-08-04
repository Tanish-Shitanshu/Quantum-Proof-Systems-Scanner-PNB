@echo off
echo.
echo Starting Quantum Shield...
echo.

:: Start backend
echo [*] Starting backend on http://localhost:8000 ...
cd backend
start "Quantum Shield Backend" cmd /k ".venv\Scripts\activate.bat && uvicorn main:app --reload --port 8000"
cd ..

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
