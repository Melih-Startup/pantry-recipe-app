@echo off
echo 🔐 Installing SSL certificate to Windows Trusted Root Store...
echo.

REM Check if certificate exists
if not exist "certs\cert.pem" (
    echo ❌ Certificate file not found: certs\cert.pem
    echo    Please run 'node generate-cert.js' first to generate the certificate.
    pause
    exit /b 1
)

REM Install certificate using certutil (requires admin privileges)
certutil -addstore -f "Root" "certs\cert.pem"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Certificate installed successfully!
    echo    The certificate is now trusted by Windows and browsers.
    echo    You may need to restart your browser for the changes to take effect.
    echo.
) else (
    echo.
    echo ❌ Error installing certificate.
    echo.
    echo ⚠️  This script requires administrator privileges.
    echo    Please right-click this file and select "Run as Administrator"
    echo.
)

pause


