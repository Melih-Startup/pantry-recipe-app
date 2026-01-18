@echo off
echo ========================================
echo   Pantry Pal Server Starter
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not found!
    echo.
    echo Please make sure:
    echo 1. Node.js is installed from https://nodejs.org/
    echo 2. You have RESTARTED your terminal/computer after installing
    echo 3. Node.js is added to your system PATH
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js found
node --version
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo node_modules folder not found!
    echo Installing dependencies (this may take a minute)...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependencies installed
    echo.
) else (
    echo [OK] Dependencies already installed
    echo.
)

echo ========================================
echo   Starting server...
echo   Open http://localhost:3000 in your browser
echo   Press Ctrl+C to stop the server
echo ========================================
echo.

node server.js



