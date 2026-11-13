$ErrorActionPreference = "Stop"

Write-Host "Checking environment..." -ForegroundColor Cyan

if (-not (Test-Path "backend\.env")) {
    Write-Host "Generating .env with random secrets..." -ForegroundColor Yellow
    Set-Location backend
    node scripts/generate-env.js
    Write-Host "Admin credentials are printed above. Save them!" -ForegroundColor Green
    Write-Host "Press any key to continue..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    Set-Location ..
}

if (-not (Test-Path "backend\node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location backend
    pnpm install
    Set-Location ..
}

Write-Host "Starting backend server..." -ForegroundColor Cyan
Set-Location backend
node server.js