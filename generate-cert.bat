@echo off
echo Generating SSL certificate for HTTPS...
echo.

REM Get the local IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set LOCAL_IP=%%a
    goto :found
)
:found
set LOCAL_IP=%LOCAL_IP:~1%

echo Using IP address: %LOCAL_IP%
echo.

REM Create certs directory if it doesn't exist
if not exist "certs" mkdir certs

REM Generate certificate
openssl req -x509 -newkey rsa:2048 -keyout certs\key.pem -out certs\cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=%LOCAL_IP%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Certificate generated successfully!
    echo.
    echo You can now start the server and access it via HTTPS.
    echo HTTPS URL: https://%LOCAL_IP%:3443
) else (
    echo.
    echo ❌ Failed to generate certificate.
    echo.
    echo OpenSSL might not be installed. Options:
    echo 1. Install OpenSSL from: https://slproweb.com/products/Win32OpenSSL.html
    echo 2. Or use Git Bash (if you have Git installed)
    echo 3. Or use WSL (Windows Subsystem for Linux)
)

pause

