# ── Quantum-Proof Systems Scanner – Root Makefile ─────────────────────────────
# Orchestrates both the React frontend and FastAPI backend.
.PHONY: install install-backend install-frontend dev dev-backend dev-frontend \
        build lint format clean help

## Install all dependencies (backend + frontend)
install: install-backend install-frontend

## Install backend Python dependencies
install-backend:
	pip install -r backend/requirements.txt

## Install frontend Node dependencies
install-frontend:
	npm install

## Start both backend and frontend in development mode (requires concurrently)
dev:
	npx concurrently \
	  "uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000" \
	  "npm run dev" \
	  --names "API,UI" \
	  --prefix-colors "cyan,magenta"

## Start only the FastAPI backend with hot-reload
dev-backend:
	uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

## Start only the Vite frontend dev server
dev-frontend:
	npm run dev

## Build the frontend for production
build:
	npm run build

## Lint frontend (ESLint) and backend (ruff)
lint:
	npm run lint
	cd backend && ruff check . 2>/dev/null || echo "ruff not installed — run: pip install ruff"

## Auto-format backend with black
format:
	cd backend && black . 2>/dev/null || echo "black not installed — run: pip install black"

## Remove build artefacts and caches
clean:
	rm -rf dist node_modules/.cache
	find backend -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find backend -name "*.pyc" -delete 2>/dev/null || true

## Show available targets
help:
	@grep -E '^## ' Makefile | sed 's/^## /  /'
