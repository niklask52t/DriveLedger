@echo off
title DriveLedger - Clean Build Artifacts
color 0E

echo.
echo   ======================================
echo        DriveLedger - Clean Up
echo   ======================================
echo.

echo [1/6] Removing node_modules...
if exist "node_modules\" rmdir /s /q "node_modules"
echo       Done.

echo [2/6] Removing dist (build output)...
if exist "dist\" rmdir /s /q "dist"
echo       Done.

echo [3/6] Removing data (SQLite database)...
if exist "data\" rmdir /s /q "data"
echo       Done.

echo [4/6] Removing package-lock.json...
if exist "package-lock.json" del /q "package-lock.json"
echo       Done.

echo [5/5] Removing TypeScript build info...
if exist "tsconfig.tsbuildinfo" del /q "tsconfig.tsbuildinfo"
if exist "tsconfig.app.tsbuildinfo" del /q "tsconfig.app.tsbuildinfo"
if exist "tsconfig.node.tsbuildinfo" del /q "tsconfig.node.tsbuildinfo"
echo       Done.

echo.
echo   ======================================
echo        Clean complete!
echo   ======================================
echo.
echo   Run "npm install" to reinstall dependencies.
echo   Run "dev.bat" to start development.
echo.
pause
