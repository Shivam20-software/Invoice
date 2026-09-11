# PowerShell script to launch the NDIS Invoice Generator Web App
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " Starting NDIS Support Coordinator Invoice Application..." -ForegroundColor Green
Write-Host " Opening browser at: http://localhost:5000" -ForegroundColor Yellow
Write-Host " Press Ctrl+C in this terminal window to stop the server." -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

Start-Process "http://localhost:5000"
python app.py
