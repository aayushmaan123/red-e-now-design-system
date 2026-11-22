@echo off
cd /d "C:\Users\aayus\RED-E-NOW"
echo ============================================================
echo Red-E Now -- Database Setup + API Test
echo ============================================================

echo.
echo --- Checking MySQL connection ---
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u rede_app -py3E485I449V44l3Cf-yKDmr2 -h 127.0.0.1 rede_now -e "SELECT 1" >nul 2>&1
if %errorlevel% neq 0 (
    echo   ERROR: Cannot connect to MySQL. Start it first in an Admin PowerShell:
    echo   ^& "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --console
    pause
    exit /b 1
)
echo   MySQL is running.

echo.
echo --- Running schema.sql ---
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u rede_app -py3E485I449V44l3Cf-yKDmr2 -h 127.0.0.1 rede_now -e "SOURCE schema.sql"
if %errorlevel% neq 0 echo   FAILED && pause && exit /b 1
echo   OK

echo --- Running seed.sql ---
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u rede_app -py3E485I449V44l3Cf-yKDmr2 -h 127.0.0.1 rede_now -e "SOURCE seed.sql"
if %errorlevel% neq 0 echo   FAILED && pause && exit /b 1
echo   OK

echo --- Running migration 001 ---
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u rede_app -py3E485I449V44l3Cf-yKDmr2 -h 127.0.0.1 rede_now -e "SOURCE database/migrations/001_package_locations_and_audit.sql"
if %errorlevel% neq 0 echo   FAILED && pause && exit /b 1
echo   OK

echo --- Running migration 002 ---
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u rede_app -py3E485I449V44l3Cf-yKDmr2 -h 127.0.0.1 rede_now -e "SOURCE database/migrations/002_pickup_appointments.sql"
if %errorlevel% neq 0 echo   FAILED && pause && exit /b 1
echo   OK

echo --- Running migration 003 ---
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u rede_app -py3E485I449V44l3Cf-yKDmr2 -h 127.0.0.1 rede_now -e "SOURCE database/migrations/003_pickup_slot_capacity.sql"
if %errorlevel% neq 0 echo   FAILED && pause && exit /b 1
echo   OK

echo --- Running migration 004 ---
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u rede_app -py3E485I449V44l3Cf-yKDmr2 -h 127.0.0.1 rede_now -e "SOURCE database/migrations/004_scheduling_settings.sql"
if %errorlevel% neq 0 echo   FAILED && pause && exit /b 1
echo   OK

echo --- Running migration 005 ---
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u rede_app -py3E485I449V44l3Cf-yKDmr2 -h 127.0.0.1 rede_now -e "SOURCE database/migrations/005_package_exceptions.sql"
if %errorlevel% neq 0 echo   FAILED && pause && exit /b 1
echo   OK

echo --- Running migration 006 ---
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u rede_app -py3E485I449V44l3Cf-yKDmr2 -h 127.0.0.1 rede_now -e "SOURCE database/migrations/006_pickup_signoff_and_wait_tracking.sql"
if %errorlevel% neq 0 echo   FAILED && pause && exit /b 1
echo   OK

echo --- Running migration 007 ---
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u rede_app -py3E485I449V44l3Cf-yKDmr2 -h 127.0.0.1 rede_now -e "SOURCE database/migrations/007_handoff_verification.sql"
if %errorlevel% neq 0 echo   FAILED && pause && exit /b 1
echo   OK

echo.
echo ============================================================
echo --- Running API Test ---
echo ============================================================
python test_api.py

echo.
echo Done.
pause
