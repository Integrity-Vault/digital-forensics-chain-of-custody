$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$venvPython = Join-Path $backend "venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
  throw "Backend virtual environment not found at $venvPython"
}

Write-Host "[setup] Initializing blockchain contract..."
& $venvPython "$backend\scripts\init_blockchain.py"

Write-Host "[setup] Starting backend (uvicorn)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$backend`"; `"$venvPython`" -m uvicorn app.main:app --reload"

Write-Host "[setup] Starting frontend (vite)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$frontend`"; npm run dev"

Write-Host "[setup] Backend and frontend launched."
