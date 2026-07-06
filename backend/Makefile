# ── Quantum-Proof Systems Scanner – Backend Developer Makefile ────────────────
.PHONY: install run dev lint format type-check test clean help

## Install all Python dependencies
install:
	pip install -r requirements.txt

## Run the FastAPI server (production mode)
run:
	uvicorn backend.main:app --host 0.0.0.0 --port 8000

## Run the FastAPI server with hot-reload (development mode)
dev:
	uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

## Lint with ruff
lint:
	ruff check .

## Auto-format with black
format:
	black .

## Static type checking with mypy
type-check:
	mypy . --ignore-missing-imports

## Run test suite
test:
	pytest tests/ -v --tb=short

## Remove Python cache files
clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true

## Show available targets
help:
	@grep -E '^## ' Makefile | sed 's/^## /  /'
