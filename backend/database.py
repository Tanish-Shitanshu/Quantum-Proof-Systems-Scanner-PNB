import json
import os
from copy import deepcopy
from typing import Dict, List

RUNTIME_STATE_PATH = os.path.join(os.path.dirname(__file__), "data", "runtime_state.json")

# In-memory runtime state
db_assets: Dict[str, dict] = {}
db_jobs: List[dict] = []
db_nodes: List[dict] = []
db_edges: List[dict] = []
db_audit_logs: List[dict] = []

DEFAULT_USERS: Dict[str, dict] = {
    "super_admin": {
        "username": "admin@quantumshield.local",
        "role": "Super Admin",
        "name": "System Administrator",
        "password": "Admin@123",
    },
    "admin": {
        "username": "j.doe@quantumshield.local",
        "role": "Admin",
        "name": "John Doe",
        "password": "Admin@123",
    },
    "user": {
        "username": "guest@quantumshield.local",
        "role": "User",
        "name": "Guest Viewer",
        "password": "User@123",
    },
}
db_users: Dict[str, dict] = deepcopy(DEFAULT_USERS)


def _ensure_runtime_dir() -> None:
    os.makedirs(os.path.dirname(RUNTIME_STATE_PATH), exist_ok=True)


def _normalize_asset_types_for_compatibility() -> None:
    for asset in db_assets.values():
        if str(asset.get("type", "")).strip().lower() == "software":
            asset["type"] = "API"


def load_runtime_state() -> bool:
    if not os.path.exists(RUNTIME_STATE_PATH):
        return False

    try:
        with open(RUNTIME_STATE_PATH, "r", encoding="utf-8") as f:
            payload = json.load(f)
    except Exception:
        return False

    db_assets.clear()
    db_assets.update(payload.get("assets", {}))

    db_jobs.clear()
    db_jobs.extend(payload.get("jobs", []))

    db_nodes.clear()
    db_nodes.extend(payload.get("nodes", []))

    db_edges.clear()
    db_edges.extend(payload.get("edges", []))

    db_audit_logs.clear()
    db_audit_logs.extend(payload.get("audit_logs", []))

    db_users.clear()
    db_users.update(payload.get("users", deepcopy(DEFAULT_USERS)))

    _normalize_asset_types_for_compatibility()
    return True


def save_runtime_state() -> None:
    _ensure_runtime_dir()
    payload = {
        "assets": db_assets,
        "jobs": db_jobs,
        "nodes": db_nodes,
        "edges": db_edges,
        "audit_logs": db_audit_logs,
        "users": db_users,
    }
    with open(RUNTIME_STATE_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def seed_database() -> None:
    """
    No mock enterprise scan rows are seeded anymore.
    We only ensure default users exist and runtime state is loaded/saved.
    """
    loaded = load_runtime_state()
    if not loaded:
        db_users.clear()
        db_users.update(deepcopy(DEFAULT_USERS))
        save_runtime_state()
        return

    # Ensure at least one Super Admin/Admin/User exists after loading state.
    existing_roles = {str(user.get("role", "")) for user in db_users.values()}
    if "Super Admin" not in existing_roles:
        db_users["super_admin"] = deepcopy(DEFAULT_USERS["super_admin"])
    if "Admin" not in existing_roles:
        db_users["admin"] = deepcopy(DEFAULT_USERS["admin"])
    if "User" not in existing_roles:
        db_users["user"] = deepcopy(DEFAULT_USERS["user"])

    save_runtime_state()


# Bootstrap on import
seed_database()
