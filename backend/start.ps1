Set-Location $PSScriptRoot
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "Starting LifeLine AI FastAPI Backend on http://localhost:8000 ..." -ForegroundColor Green
Write-Host "Virtual Environment: .venv" -ForegroundColor Yellow
Write-Host "====================================================================" -ForegroundColor Cyan

& ".\.venv\Scripts\python.exe" -m uvicorn app.main:app --reload --port 8000 --host 0.0.0.0

