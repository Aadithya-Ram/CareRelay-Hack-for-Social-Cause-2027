@echo off
setlocal
cd /d "%~dp0"
title CareRelay - Local Website
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22.13 or newer, then double-click this file again.
  pause
  exit /b 1
)
node scripts\start-local.mjs %*
if errorlevel 1 (
  echo.
  echo CareRelay could not start. Please read the message above.
  pause
)
