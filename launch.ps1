# Pinguin: Launch with HMR (Vite + Neutralino)
# The launcher reserves separate Vite and Neutralino ports, patches the
# development HTML before opening the native window, and restores it on exit.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "Launching Pinguin with HMR..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop all processes" -ForegroundColor Yellow
node scripts/start-dev.js
# Frontend HMR: edit .tsx/.ts files to update instantly via Vite.
# Backend changes: detected by file watcher; use Reload in the UI.
# Extension connection: patched HTML loads NL_PORT/NL_TOKEN before WebSocket startup.
