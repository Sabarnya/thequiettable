@echo off
REM Double-click this from inside the project folder to preview the site on localhost.
cd /d "%~dp0"

if not exist "index.html" (
  echo index.html not found next to this file.
  echo Put start-localhost.bat in the project folder that contains index.html.
  pause
  exit /b
)

where python >nul 2>nul
if %errorlevel%==0 (
  echo Serving at http://localhost:8000 ...
  start "" http://localhost:8000/index.html
  python -m http.server 8000
  goto end
)

where py >nul 2>nul
if %errorlevel%==0 (
  echo Serving at http://localhost:8000 ...
  start "" http://localhost:8000/index.html
  py -m http.server 8000
  goto end
)

echo Python not found - using the built-in PowerShell server instead...
powershell -ExecutionPolicy Bypass -File "%~dp0serve.ps1"

:end
