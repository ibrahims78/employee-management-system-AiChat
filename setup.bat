@echo off
setlocal EnableDelayedExpansion
title Employee Management System - Setup

set "INSTALL_DIR=C:\employee-management"
set "REPO_URL=https://github.com/ibrahims78/employee-management-system.git"
set "APP_PORT=5001"
set "MAX_RETRIES=3"

cls
echo ================================================
echo   Employee Management System - Setup Script
echo ================================================
echo.

echo [1/8] Checking Administrator privileges...
net session >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [ERROR] Please run this file as Administrator.
    echo         Right-click setup.bat and choose "Run as administrator"
    pause
    exit /b 1
)
echo [OK] Running as Administrator.

echo [2/8] Checking Git...
git --version >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [INFO] Git not found. Installing Git silently...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/Git-2.44.0-64-bit.exe' -OutFile '%TEMP%\git_installer.exe'"
    start /wait "" "%TEMP%\git_installer.exe" /VERYSILENT
    echo [OK] Git installed.
) else (
    echo [OK] Git is available.
)

echo [3/8] Checking Docker...
docker info >nul 2>&1
if %errorLevel% NEQ 0 (
    echo [ERROR] Docker is not running. Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo [OK] Docker is running.

echo [4/8] Cloning or Updating Repository...
if exist "%INSTALL_DIR%\.git" (
    cd /d "%INSTALL_DIR%"
    echo      Pulling latest changes from GitHub...
    git pull origin main
    if %errorLevel% NEQ 0 (
        echo [ERROR] Failed to pull latest changes from GitHub.
        pause
        exit /b 1
    )
    echo [OK] Repository updated successfully.
) else (
    echo      Cloning repository from GitHub...
    git clone --depth 1 %REPO_URL% "%INSTALL_DIR%"
    if %errorLevel% NEQ 0 (
        echo [ERROR] Failed to clone repository from GitHub.
        pause
        exit /b 1
    )
    echo [OK] Repository cloned successfully.
)

echo [5/8] Setting Up Storage Folders...
if not exist "%INSTALL_DIR%\storage" mkdir "%INSTALL_DIR%\storage"
if not exist "%INSTALL_DIR%\storage\uploads" mkdir "%INSTALL_DIR%\storage\uploads"
if not exist "%INSTALL_DIR%\storage\backups" mkdir "%INSTALL_DIR%\storage\backups"
echo [OK] Storage folders ready.

echo [6/8] Building and Starting Containers...
cd /d "%INSTALL_DIR%"
docker compose down >nul 2>&1

:: --- Retry loop for Docker build (handles network errors like ECONNRESET) ---
set "BUILD_OK=0"
set "ATTEMPT=0"

:BUILD_LOOP
set /a ATTEMPT+=1
echo      Build attempt %ATTEMPT% of %MAX_RETRIES%...

if %ATTEMPT% GTR 1 (
    echo      Cleaning Docker build cache before retry...
    docker builder prune -f >nul 2>&1
    echo      Waiting 10 seconds before retrying...
    timeout /t 10 /nobreak >nul
)

docker compose up --build -d
if %errorLevel% EQU 0 (
    set "BUILD_OK=1"
    goto BUILD_DONE
)

if %ATTEMPT% LSS %MAX_RETRIES% (
    echo [WARN] Build attempt %ATTEMPT% failed. Retrying...
    goto BUILD_LOOP
)

:BUILD_DONE
if "%BUILD_OK%"=="0" (
    echo.
    echo [ERROR] Docker build failed after %MAX_RETRIES% attempts.
    echo.
    echo   Possible reasons:
    echo   1. Network connection is unstable - check your internet connection
    echo   2. Docker Desktop needs more resources - open Docker Desktop Settings
    echo      and increase Memory to at least 4GB
    echo   3. Try disabling VPN or antivirus temporarily and run again
    echo   4. Try running: docker system prune -f  then run setup.bat again
    echo.
    pause
    exit /b 1
)
echo [OK] Containers started successfully.

echo [7/8] Waiting for application to initialize...
timeout /t 15 /nobreak >nul
echo.
echo --- Container Status ---
docker ps --filter "name=staff-health" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo.
echo --- Application Logs (last 15 lines) ---
docker logs staff-health-app --tail 15 2>&1
echo.
docker logs staff-health-app 2>&1 | findstr /C:"serving on port" >nul
if %errorLevel% EQU 0 (
    echo [OK] Application is running successfully.
) else (
    echo [WARN] Application may still be starting. Check the logs above.
)

echo [8/8] Done.
echo.
echo ================================================
echo   Setup Complete!
echo   Open  : http://localhost:%APP_PORT%
echo   Login : admin / 123456
echo ================================================
echo.
start http://localhost:%APP_PORT%
pause
