# Pinguin: Launch with HMR (Vite + Neutralino)
# `neu run` handles the lifecycle: starts Vite via frontendLibrary.devCommand,
# waits for the dev server, patches index.html with NL_PORT/NL_TOKEN,
# then launches Neutralino. Extensions connect automatically.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "Launching Pinguin with HMR..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop all processes" -ForegroundColor Yellow
npx @neutralinojs/neu run
# Frontend HMR: edit .tsx/.ts files — updates instantly via Vite dev server
# Backend changes: detected by file watcher → shows Reload button in UI → click to reload
# Extension connection: Neutralino patches HTML → NL_PORT/NL_TOKEN injected → WebSocket connects
