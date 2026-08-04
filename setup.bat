@echo off
echo.
echo ============================================
echo   Quantum Shield - One-Click Setup
echo ============================================
echo.

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] Node.js not found. Please install it from https://nodejs.org
    echo     Then re-run this script.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do echo [OK] Node.js found: %%i
)

:: Check for Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] Python not found. Please install it from https://python.org
    echo     Make sure to check "Add Python to PATH" during install.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('python --version') do echo [OK] Python found: %%i
)

:: Install frontend dependencies
echo.
echo [*] Installing frontend dependencies...
call npm install

:: Set up backend
echo.
echo [*] Setting up backend...
cd backend
python -m venv .venv
call .venv\Scripts\activate.bat
pip install -r requirements.txt
call deactivate
cd ..

echo.
echo ============================================
echo   Setup complete!
echo.
echo   To start the app, run:  start.bat
echo ============================================
echo.
pause
