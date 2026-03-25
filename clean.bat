@echo off
title DriveLedger - Clean Build Artifacts
color 0E

echo.
echo   ======================================
echo        DriveLedger - Clean Up
echo   ======================================
echo.

echo [1/7] Removing node_modules...
if exist "node_modules\" rmdir /s /q "node_modules"
echo       Done.

echo [2/7] Removing dist (build output)...
if exist "dist\" rmdir /s /q "dist"
echo       Done.

echo [3/7] Stopping and removing dev database container...
docker stop driveledger-dev-db >nul 2>nul
docker rm driveledger-dev-db >nul 2>nul
echo       Done.

echo [4/7] Removing dev database Docker volume...
docker volume rm driveledger-dev-db >nul 2>nul
echo       Done (volume removed if it existed).

echo [5/7] Removing package-lock.json...
if exist "package-lock.json" del /q "package-lock.json"
echo       Done.

echo [6/7] Clearing npm cache...
call npm cache clean --force >nul 2>&1
echo       Done.

echo [7/7] Removing TypeScript build info...
if exist "tsconfig.tsbuildinfo" del /q "tsconfig.tsbuildinfo"
if exist "tsconfig.app.tsbuildinfo" del /q "tsconfig.app.tsbuildinfo"
if exist "tsconfig.node.tsbuildinfo" del /q "tsconfig.node.tsbuildinfo"
echo       Done.

echo.
echo   ======================================
echo        Clean complete!
echo   ======================================
echo.
echo   Run "dev.bat" to start development.
echo.
pause
