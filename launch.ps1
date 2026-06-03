# Pinguin: Build and launch
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "Building webview..." -ForegroundColor Cyan
npm run build:webview
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

Write-Host "Launching Pinguin..." -ForegroundColor Cyan
npx neu run
