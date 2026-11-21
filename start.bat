@echo off
echo ============================================================
echo   CertiFlow - Pragati Skills Mission
echo   Starting with Docker Compose...
echo ============================================================
echo.

REM Check Docker is running
docker info >nul 2>&1
if errorlevel 1 (
  echo ERROR: Docker is not running. Please start Docker Desktop first.
  pause
  exit /b 1
)

echo [1/3] Building and starting all services...
docker compose up --build -d

if errorlevel 1 (
  echo ERROR: docker compose up failed.
  pause
  exit /b 1
)

echo.
echo [2/3] Waiting for services to be healthy (60s)...
timeout /t 60 /nobreak >nul

echo.
echo [3/3] Seeding demo database...
docker compose exec backend npx ts-node --transpile-only prisma/seed.ts

echo.
echo ============================================================
echo   CertiFlow is ready!
echo.
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:3001
echo   Health:    http://localhost:3001/health
echo   Verify:    http://localhost:5173/verify
echo.
echo   Demo login: anika@certiflow.gov.in / Demo@1234
echo ============================================================
echo.
pause
