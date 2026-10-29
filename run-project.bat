@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

echo ========================================================
echo               PARKFIND SMART PARKING SYSTEM            
echo ========================================================
echo.

:: 1. Check if MySQL is running on port 3307
echo [1/3] Checking MySQL database on port 3307...
netstat -ano | findstr ":3307" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo     MySQL is already running on port 3307.
) else (
    echo     Starting MySQL server...
    start "ParkFind - MySQL Server 9.7 (Port 3307)" "%~dp0start-mysql.bat"
    echo     Waiting for MySQL server to start on port 3307...
    set /a attempts=0
    :wait_mysql
    timeout /t 1 /nobreak >nul
    set /a attempts+=1
    netstat -ano | findstr ":3307" | findstr "LISTENING" >nul
    if %errorlevel% neq 0 (
        if !attempts! lss 15 goto wait_mysql
        echo     [WARNING] MySQL taking longer than expected to start.
    ) else (
        echo     MySQL server is ready on port 3307.
    )
)

:: 2. Check if Backend is running on port 5000
echo [2/3] Checking Backend API on port 5000...
netstat -ano | findstr ":5000" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo     Backend API is already running on port 5000.
) else (
    echo     Starting Backend API...
    start "ParkFind - Backend API (Port 5000)" cmd /k "cd Backend && npm run dev"
    timeout /t 3 /nobreak >nul
)

:: 3. Check if Frontend is running on port 5173
echo [3/3] Checking Frontend on port 5173...
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo     Frontend is already running on port 5173.
) else (
    echo     Starting Frontend Vite Dev Server...
    start "ParkFind - Frontend UI (Port 5173)" cmd /k "cd Frontend && npm run dev"
    timeout /t 2 /nobreak >nul
)

echo.
echo ========================================================
echo All services are active!
echo Frontend: http://localhost:5173
echo Backend API: http://localhost:5000
echo Database: MySQL 9.7 on 127.0.0.1:3307 (ParkIt)
echo ========================================================
echo.
timeout /t 2 >nul
start http://localhost:5173
pause
