# Pi-GUI: Dev build, watch, and launch
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "Building + launching Pi-GUI (watch mode)..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop all processes" -ForegroundColor Yellow
npm run dev:all
# dev:all does: build:webview → concurrently(vite build --watch, backend, neu run)
