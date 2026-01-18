Write-Host "Generating SSL certificate for HTTPS..." -ForegroundColor Cyan
Write-Host ""

# Get local IP address
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress

if (-not $localIP) {
    $localIP = "localhost"
}

Write-Host "Using IP address: $localIP" -ForegroundColor Yellow
Write-Host ""

# Create certs directory if it doesn't exist
if (-not (Test-Path "certs")) {
    New-Item -ItemType Directory -Path "certs" | Out-Null
}

# Generate certificate
try {
    $opensslCmd = "openssl req -x509 -newkey rsa:2048 -keyout certs\key.pem -out certs\cert.pem -days 365 -nodes -subj `"/C=US/ST=State/L=City/O=Organization/CN=$localIP`""
    
    Invoke-Expression $opensslCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Certificate generated successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "You can now start the server and access it via HTTPS." -ForegroundColor Cyan
        Write-Host "HTTPS URL: https://$localIP`:3443" -ForegroundColor Yellow
    } else {
        throw "OpenSSL command failed"
    }
} catch {
    Write-Host ""
    Write-Host "❌ Failed to generate certificate." -ForegroundColor Red
    Write-Host ""
    Write-Host "OpenSSL might not be installed. Options:" -ForegroundColor Yellow
    Write-Host "1. Install OpenSSL from: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor White
    Write-Host "2. Or use Git Bash (if you have Git installed)" -ForegroundColor White
    Write-Host "3. Or use WSL (Windows Subsystem for Linux)" -ForegroundColor White
    Write-Host ""
    Write-Host "After installing OpenSSL, make sure it's in your PATH, then run this script again." -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to continue"

