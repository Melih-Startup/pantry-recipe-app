# Script to install the self-signed certificate to Windows Trusted Root Certificate Store
# This will make browsers trust the certificate without showing warnings

Write-Host "🔐 Installing SSL certificate to Windows Trusted Root Store..." -ForegroundColor Cyan

$certPath = Join-Path $PSScriptRoot "certs\cert.pem"

if (-not (Test-Path $certPath)) {
    Write-Host "❌ Certificate file not found: $certPath" -ForegroundColor Red
    Write-Host "   Please run 'node generate-cert.js' first to generate the certificate." -ForegroundColor Yellow
    exit 1
}

try {
    # Read the PEM certificate file
    $certContent = Get-Content $certPath -Raw
    
    # Convert PEM to base64 (remove headers and whitespace)
    $certBase64 = $certContent -replace '-----BEGIN CERTIFICATE-----','' -replace '-----END CERTIFICATE-----','' -replace '\s',''
    
    # Convert base64 string to byte array
    $certBytes = [System.Convert]::FromBase64String($certBase64)
    
    # Create certificate object from bytes
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certBytes)
    
    # Import the certificate to the Trusted Root Certificate Store
    # This requires administrator privileges
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store([System.Security.Cryptography.X509Certificates.StoreName]::Root, [System.Security.Cryptography.X509Certificates.StoreLocation]::LocalMachine)
    
    $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
    $store.Add($cert)
    $store.Close()
    
    Write-Host "✅ Certificate installed successfully!" -ForegroundColor Green
    Write-Host "   The certificate is now trusted by Windows and browsers." -ForegroundColor Green
    Write-Host "   You may need to restart your browser for the changes to take effect." -ForegroundColor Yellow
    Write-Host ""
} catch {
    Write-Host "❌ Error installing certificate: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "⚠️  This script requires administrator privileges." -ForegroundColor Yellow
    Write-Host "   Please run PowerShell as Administrator and try again." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   To run as Administrator:" -ForegroundColor Cyan
    Write-Host "   1. Right-click PowerShell" -ForegroundColor Cyan
    Write-Host "   2. Select Run as Administrator" -ForegroundColor Cyan
    Write-Host "   3. Navigate to this directory" -ForegroundColor Cyan
    Write-Host "   4. Run: .\install-certificate.ps1" -ForegroundColor Cyan
    exit 1
}

