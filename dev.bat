@echo off
title DriveLedger - Development Server
color 0A

echo.
echo   ======================================
echo        DriveLedger - Dev Environment
echo   ======================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Always install/update dependencies
echo [INFO] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)
echo.

:: Check if .env exists
if not exist ".env" (
    echo [INFO] Creating .env from .env.example...
    copy .env.example .env >nul
    echo [INFO] .env created. Edit it with your settings before first use.
    echo.
)

:: Check if data directory exists
if not exist "data\" (
    echo [INFO] First run - database will be created automatically.
    echo [INFO] Default admin: admin@driveledger.app / Admin123!
    echo.
)

echo [START] Starting DriveLedger...
echo [START] Backend:  http://localhost:3001
echo [START] Frontend: http://localhost:5173
echo.
echo Press Ctrl+C to stop.
echo.

call npm run dev
