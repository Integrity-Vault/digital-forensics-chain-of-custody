#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
VENV_PYTHON="$BACKEND_DIR/venv/bin/python"

if [ ! -x "$VENV_PYTHON" ]; then
  echo "[setup] Backend virtual environment not found at $VENV_PYTHON"
  exit 1
fi

echo "[setup] Initializing blockchain contract..."
"$VENV_PYTHON" "$BACKEND_DIR/scripts/init_blockchain.py"

echo "[setup] Starting backend (uvicorn)..."
(cd "$BACKEND_DIR" && "$VENV_PYTHON" -m uvicorn app.main:app --reload) &

echo "[setup] Starting frontend (vite)..."
(cd "$FRONTEND_DIR" && npm run dev) &

wait
