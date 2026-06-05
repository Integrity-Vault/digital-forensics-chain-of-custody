#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BLOCKCHAIN_DIR="$ROOT_DIR/blockchain"
VENV_DIR="$BACKEND_DIR/venv"
VENV_PYTHON="$VENV_DIR/bin/python"
ENV_FILE="$BACKEND_DIR/.env"
ENV_EXAMPLE="$BACKEND_DIR/.env.example"

INSTALL_ONLY=false
if [[ "${1:-}" == "--install-only" ]]; then
  INSTALL_ONLY=true
fi

echo "[setup] Digital Forensics Chain of Custody"

if [[ ! -d "$VENV_DIR" ]]; then
  echo "[setup] Creating Python virtual environment..."
  python3 -m venv "$VENV_DIR"
fi

echo "[setup] Installing backend dependencies..."
"$VENV_PYTHON" -m pip install --upgrade pip
"$VENV_PYTHON" -m pip install -r "$BACKEND_DIR/requirements.txt"

echo "[setup] Installing frontend dependencies..."
(cd "$FRONTEND_DIR" && npm install)

echo "[setup] Installing blockchain deploy dependencies..."
(cd "$BLOCKCHAIN_DIR" && npm install)

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  echo "[setup] Created $ENV_FILE from .env.example"
fi

if $INSTALL_ONLY; then
  echo "[setup] Install complete. Next steps:"
  echo "  1. Start Ganache on http://127.0.0.1:7545"
  echo "  2. $VENV_PYTHON $BACKEND_DIR/scripts/init_blockchain.py"
  echo "  3. $VENV_PYTHON -m uvicorn app.main:app --reload  (from backend/)"
  echo "  4. npm run dev  (from frontend/)"
  exit 0
fi

echo "[setup] Ensure Ganache is running on http://127.0.0.1:7545"
echo "[setup] Initializing blockchain contract..."
"$VENV_PYTHON" "$BACKEND_DIR/scripts/init_blockchain.py"

echo "[setup] Starting backend (uvicorn)..."
(cd "$BACKEND_DIR" && "$VENV_PYTHON" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000) &

echo "[setup] Starting frontend (vite)..."
(cd "$FRONTEND_DIR" && npm run dev) &

echo "[setup] Backend: http://127.0.0.1:8000  |  Frontend: http://localhost:5173"
wait
