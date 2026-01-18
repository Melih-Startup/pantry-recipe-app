# PowerShell script to start the Pantry Pal server
Write-Host "Starting Pantry Pal Server..." -ForegroundColor Green
Write-Host ""

# Try to find node in common locations
$nodePaths = @(
    "$env:ProgramFiles\nodejs\node.exe",
    "$env:ProgramFiles(x86)\nodejs\node.exe",
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
    "node"
)

$nodeFound = $false
foreach ($nodePath in $nodePaths) {
    try {
        $null = Get-Command $nodePath -ErrorAction Stop
        Write-Host "Found Node.js at: $nodePath" -ForegroundColor Yellow
        & $nodePath server.js
        $nodeFound = $true
        break
    } catch {
        continue
    }
}

if (-not $nodeFound) {
    Write-Host "ERROR: Node.js not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "Or add Node.js to your system PATH." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

