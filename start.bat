@echo off
REM Start Harmony HR System with both frontend and backend

echo.
echo ========================================
echo  Harmony HR System - Full Stack
echo ========================================
echo.

REM Check if Docker is available
where docker >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Docker found! Starting with Docker...
    docker-compose up
) else (
    echo Docker not found. Starting locally...
    echo.
    echo Starting backend in one terminal...
    start cmd /k "cd backend && npm run dev"
    
    timeout /t 3
    
    echo Starting frontend in another terminal...
    start cmd /k "npm run dev"
    
    echo.
    echo ========================================
    echo Frontend will be available at: http://localhost:5173
    echo Backend API will be available at: http://localhost:3000
    echo ========================================
)
