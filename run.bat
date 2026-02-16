@echo off
REM MovieBox Movie Site Setup and Run Script for Windows

echo.
echo ========================================
echo   CinemaHub - MovieBox Setup
echo ========================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org
    pause
    exit /b 1
)

echo [✓] Python found
echo.

REM Set default Moviebox host if not provided
set MOVIEBOX_API_HOST=h5.aoneroom.com
echo [*] Using MOVIEBOX_API_HOST=%MOVIEBOX_API_HOST%

echo.

REM Create virtual environment if it doesn't exist
if not exist venv (
    echo [*] Creating virtual environment...
    python -m venv venv
    echo [✓] Virtual environment created
) else (
    echo [✓] Virtual environment already exists
)

echo.

REM Activate virtual environment
echo [*] Activating virtual environment...
call venv\Scripts\activate.bat

echo [✓] Virtual environment activated
echo.

REM Install dependencies
echo [*] Installing dependencies...
pip install -q -r requirements.txt

if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo [✓] Dependencies installed
echo.

REM Run the Flask app
echo ========================================
echo   Starting CinemaHub Server
echo ========================================
echo.
echo [✓] Server starting on http://localhost:5000
echo [✓] Frontend: http://localhost:5000
echo [✓] API: http://localhost:5000/api
echo.
echo Press Ctrl+C to stop the server
echo.

python app.py
