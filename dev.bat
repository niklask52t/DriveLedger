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

:: Check Docker
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Docker is required for the database.
    echo Please install Docker Desktop from https://www.docker.com/
    pause
    exit /b 1
)

:: Start MariaDB container if not running
docker ps --filter "name=driveledger-dev-db" --format "{{.Names}}" | findstr /i "driveledger-dev-db" >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Starting MariaDB database container...
    docker run -d --name driveledger-dev-db -p 3306:3306 -e MYSQL_ROOT_PASSWORD=rootpassword -e MYSQL_DATABASE=driveledger -e MYSQL_USER=driveledger -e MYSQL_PASSWORD=driveledger mariadb:11 >nul 2>nul
    if %errorlevel% neq 0 (
        :: Container might exist but be stopped
        docker start driveledger-dev-db >nul 2>nul
    )
    echo [INFO] Waiting for database to be ready...
    timeout /t 10 /nobreak >nul
) else (
    echo [INFO] MariaDB database already running.
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

echo [START] Starting DriveLedger...
echo [START] Backend:  http://localhost:3001
echo [START] Frontend: http://localhost:5173
echo.
echo Press Ctrl+C to stop.
echo.

call npm run dev
