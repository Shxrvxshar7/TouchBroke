@echo off
setlocal
title TouchBroke

:: ── 1. Check Python ──────────────────────────────────────────────────────────
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  Python not found.
    echo  Install it from:  https://python.org/downloads
    echo  IMPORTANT: tick "Add Python to PATH" during install.
    echo.
    pause
    exit /b 1
)

:: ── 2. Elevate to Administrator (needed for pywin32 and brightness) ──────────
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

:: Running as Administrator from here
cd /d "%~dp0"

:: ── 3. Install / update dependencies silently ────────────────────────────────
echo  Checking dependencies...
pip install -r requirements.txt -q --disable-pip-version-check
if %errorlevel% neq 0 (
    echo.
    echo  Failed to install dependencies.
    echo  Try manually:  pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

:: ── 4. Server restart loop ────────────────────────────────────────────────────
:loop
cls
python server/main.py
echo.
echo  TouchBroke stopped.  Press any key to restart...
pause >nul
goto loop
