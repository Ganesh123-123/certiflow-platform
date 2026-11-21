@echo off
echo ============================================================
echo   CertiFlow - Local Development (without Docker)
echo   Starting Backend + Frontend dev servers
echo ============================================================
echo.

REM Start backend in a new terminal
echo Starting backend on :3001 ...
start "CertiFlow Backend" cmd /k "cd /d %~dp0backend && npm run dev"

REM Small delay
timeout /t 3 /nobreak >nul

REM Start frontend in a new terminal
echo   Starting frontend on :5174 ...
start "CertiFlow Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo   Backend:  http://localhost:3001/health
echo   Frontend: http://localhost:5174
echo.
echo Note: Ensure PostgreSQL and Redis are running first!
echo See SETUP.md for database setup instructions.
echo.
pause
