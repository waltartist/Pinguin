# Pi-GUI: Dev build, watch, and launch
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "Launching Pi-GUI with HMR..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop all processes" -ForegroundColor Yellow
npm run dev:all
# dev:all does: concurrently(vite dev, neu run)
# Frontend HMR: edit .tsx/.ts files — updates instantly via Vite dev server
# Backend changes: detected by file watcher → shows Reload button in UI → click to reload
