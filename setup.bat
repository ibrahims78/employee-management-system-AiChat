@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion
title Staff Health Analyzer - Secure Setup

:: Enable color support in Windows console
reg add HKCU\Console /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul 2>&1

set "INSTALL_DIR=C:\staff_health_2026"
set "REPO_URL=https://github.com/ibrahims78/Staff-Health-Analyzer.git"
set "APP_PORT=5001"
set "LOG_FILE=%INSTALL_DIR%\setup_report.txt"

cls
echo [1/8] Checking Administrator privileges...
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [ERROR] Please run as Administrator.
    pause & exit
)

echo [2/8] Checking Git...
git --version >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [INFO] Git not found. Installing Git...
    powershell -Command "& {Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/Git-2.44.0-64-bit.exe' -OutFile '%TEMP%\git_installer.exe'}"
    start /wait "" "%TEMP%\git_installer.exe" /VERYSILENT
)

echo [3/8] Checking Docker...
docker info >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [ERROR] Docker is not running. Please start Docker Desktop and try again.
    pause & exit
)

echo [4/8] Cloning/Updating Repository...
if exist "%INSTALL_DIR%\.git" (
    cd /d "%INSTALL_DIR%"
    git pull origin main
    if %errorLevel% NEQ 0 (
        echo [ERROR] Failed to pull latest changes from GitHub.
        pause & exit
    )
    echo [OK] Repository updated successfully.
) else (
    git clone --depth 1 %REPO_URL% "%INSTALL_DIR%"
    if %errorLevel% NEQ 0 (
        echo [ERROR] Failed to clone repository from GitHub.
        pause & exit
    )
    echo [OK] Repository cloned successfully.
)

echo [5/8] Setting Up Permissions...
if not exist "%INSTALL_DIR%\storage" mkdir "%INSTALL_DIR%\storage"
icacls "%INSTALL_DIR%" /inheritance:r /grant:r Administrators:(OI)(CI)F /grant:r Users:(OI)(CI)RX
icacls "%INSTALL_DIR%\storage" /grant:r Users:(OI)(CI)M

echo [6/8] Building and Starting Containers...
cd /d "%INSTALL_DIR%"
docker compose down >nul 2>&1
docker compose up --build -d
if %errorLevel% NEQ 0 (
    echo [ERROR] Docker build failed. Check the output above for details.
    pause & exit
)
echo [OK] Containers started. Waiting 10 seconds for application to initialize...

:: Wait 10 seconds for the application to fully start before checking logs
timeout /t 10 /nobreak >nul

echo [7/8] Verifying Application Status...
echo.
echo --- Container Status ---
docker ps --filter "name=staff-health" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.
echo --- Application Logs (last 20 lines) ---
docker logs staff-health-app --tail 20
echo.

:: Check application startup success message in logs
docker logs staff-health-app 2>&1 | findstr /C:"Starting application" >nul
if %errorLevel% EQU 0 (
    echo [OK] Application is running successfully!
) else (
    echo [WARN] Application may still be initializing. Check the logs above for details.
)

echo [8/8] Finalizing...
echo.
echo ================================================
echo   Setup Complete!
echo   Open  : http://localhost:%APP_PORT%
echo   Login : admin / 123456
echo ================================================
echo.
start http://localhost:%APP_PORT%
echo Setup report saved to: %LOG_FILE%
pause
