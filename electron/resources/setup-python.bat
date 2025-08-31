
@echo off
echo Installing Python dependencies...

REM Check if pip is available
pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python pip not found. Please install Python first.
    pause
    exit /b 1
)

REM Install requirements
pip install -r requirements.txt

echo Python dependencies installed!
