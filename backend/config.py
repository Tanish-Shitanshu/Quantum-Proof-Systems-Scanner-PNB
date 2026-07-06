"""
Central configuration for the Quantum-Proof Systems Scanner backend.

All tunable constants live here so they can be changed in one place
without hunting through engine files.
"""

import os

# ── API / Server ──────────────────────────────────────────────────────────────
API_TITLE: str = "Quantum-Proof Systems Scanner API"
API_VERSION: str = "1.0.0"

# ── CORS ─────────────────────────────────────────────────────────────────────
# Tighten this list in production; "*" is fine for hackathon demos.
CORS_ALLOWED_ORIGINS: list[str] = ["*"]

# ── Scanner limits ────────────────────────────────────────────────────────────
MAX_SUBDOMAINS_TO_SCAN: int = int(os.environ.get("MAX_SUBDOMAINS", 40))
SUBDOMAIN_SCAN_WORKERS: int = int(os.environ.get("SUBDOMAIN_WORKERS", 12))
MAX_VULN_SCAN_TARGETS: int = int(os.environ.get("MAX_VULN_TARGETS", 15))
VULN_SCAN_WORKERS: int = int(os.environ.get("VULN_WORKERS", 10))

# ── Rate limiting ─────────────────────────────────────────────────────────────
RATE_LIMIT_WINDOW_SECONDS: int = 60
RATE_LIMIT_MAX_REQUESTS: int = 10   # per IP per window

# ── Risk scoring weights (must sum to 1.0) ────────────────────────────────────
RISK_WEIGHTS: dict[str, float] = {
    "crypto": 0.30,
    "protocol": 0.20,
    "vulnerability": 0.20,
    "exposure": 0.10,
    "third_party": 0.10,
    "governance": 0.10,
}
assert abs(sum(RISK_WEIGHTS.values()) - 1.0) < 1e-9, "Risk weights must sum to 1.0"

# ── PQC KEM group IDs ─────────────────────────────────────────────────────────
PQC_GROUP_ID_MAP: dict[int, str] = {
    0x6399: "X25519Kyber768 (Hybrid PQC)",
    0x2F39: "X25519Kyber512 (Hybrid PQC)",
    0x023A: "Kyber512",
    0x023B: "Kyber768",
    0x023C: "Kyber1024",
    0x11EC: "MLKEM-768",
    0x11ED: "MLKEM-1024",
}

# ── Certificate expiry thresholds (days) ──────────────────────────────────────
CERT_EXPIRY_CRITICAL_DAYS: int = 14
CERT_EXPIRY_WARNING_DAYS: int = 30

# ── Scheduler ─────────────────────────────────────────────────────────────────
SCHEDULER_TIMEZONE: str = "UTC"
