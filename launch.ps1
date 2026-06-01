# Pinguin: Launch with HMR (Vite + Neutralino)
# The launcher selects available Vite and Neutralino ports. Vite serves the
# Neutralino development globals with NL_TOKEN injected for the webview.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "Launching Pinguin with HMR..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop all processes" -ForegroundColor Yellow
node scripts/start-dev.js
# Frontend HMR: edit .tsx/.ts files to update instantly via Vite.
# Backend changes: detected by file watcher; use Reload in the UI.
# Extension connection: Vite injects NL_PORT/NL_TOKEN before WebSocket startup.
