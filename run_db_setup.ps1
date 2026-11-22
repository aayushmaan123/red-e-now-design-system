# Red-E Now — Database setup + API test
# Run from RED-E-NOW repo root in PowerShell

$mysql = "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe"
$creds = '-u', 'rede_app', '-py3E485I449V44l3Cf-yKDmr2', '-h', '127.0.0.1', 'rede_now'

Write-Host "=== Checking MySQL connection ===" -ForegroundColor Cyan
try {
    & $mysql @creds -e "SELECT 1" 2>&1 | Out-Null
    Write-Host "  MySQL is running." -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Cannot connect to MySQL. Start it first:" -ForegroundColor Red
    Write-Host '  Run in Admin PowerShell: & "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --console' -ForegroundColor Yellow
    exit 1
}

$scripts = @(
    "schema.sql",
    "seed.sql",
    "database/migrations/001_package_locations_and_audit.sql",
    "database/migrations/002_pickup_appointments.sql",
    "database/migrations/003_pickup_slot_capacity.sql",
    "database/migrations/004_scheduling_settings.sql",
    "database/migrations/005_package_exceptions.sql",
    "database/migrations/006_pickup_signoff_and_wait_tracking.sql",
    "database/migrations/007_handoff_verification.sql"
)

Write-Host "`n=== Running schema + seed + migrations ===" -ForegroundColor Cyan
foreach ($s in $scripts) {
    Write-Host "  Running $s ..." -NoNewline
    $result = & $mysql @creds -e "SOURCE $s" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host " OK" -ForegroundColor Green
    } else {
        Write-Host " FAILED" -ForegroundColor Red
        Write-Host "  $result" -ForegroundColor Red
    }
}

Write-Host "`n=== Running API test ===" -ForegroundColor Cyan
python test_api.py

Write-Host "`nDone. Press Enter to close."
Read-Host
