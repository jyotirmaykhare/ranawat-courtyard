@echo off
setlocal
cd /d "%~dp0"
curl --silent --fail http://localhost:4173/ --output NUL >nul 2>nul
if errorlevel 1 (
  start "Ranawat Heritage local server" /D "%~dp0" cmd.exe /k "npm start"
  ping -n 4 127.0.0.1 >nul
)
start "" "http://localhost:4173"
