param(
    [switch]$InstallOnly
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$blockchain = Join-Path $root "blockchain"
$venvDir = Join-Path $backend "venv"
$venvPython = Join-Path $venvDir "Scripts\python.exe"
$envFile = Join-Path $backend ".env"
$envExample = Join-Path $backend ".env.example"

Write-Host "[setup] Digital Forensics Chain of Custody"

if (-not (Test-Path $venvDir)) {
    Write-Host "[setup] Creating Python virtual environment..."
    python -m venv $venvDir
}

Write-Host "[setup] Installing backend dependencies..."
& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install -r (Join-Path $backend "requirements.txt")

Write-Host "[setup] Installing frontend dependencies..."
Push-Location $frontend
npm install
Pop-Location

Write-Host "[setup] Installing blockchain deploy dependencies..."
Push-Location $blockchain
npm install
Pop-Location

if (-not (Test-Path $envFile)) {
    Copy-Item $envExample $envFile
    Write-Host "[setup] Created backend/.env from .env.example"
}

if ($InstallOnly) {
    Write-Host "[setup] Install complete. Next steps:"
    Write-Host "  1. Start Ganache on http://127.0.0.1:7545"
    Write-Host "  2. $venvPython $backend\scripts\init_blockchain.py"
    Write-Host "  3. uvicorn app.main:app --reload  (from backend/)"
    Write-Host "  4. npm run dev  (from frontend/)"
    exit 0
}

Write-Host "[setup] Ensure Ganache is running on http://127.0.0.1:7545"
Write-Host "[setup] Initializing blockchain contract..."
& $venvPython "$backend\scripts\init_blockchain.py"

Write-Host "[setup] Starting backend (uvicorn)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$backend`"; `"$venvPython`" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

Write-Host "[setup] Starting frontend (vite)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$frontend`"; npm run dev"

Write-Host "[setup] Backend: http://127.0.0.1:8000  |  Frontend: http://localhost:5173"
