import json
import os
from copy import deepcopy
from threading import RLock
from typing import Dict, List

RUNTIME_STATE_PATH = os.path.join(os.path.dirname(__file__), "data", "runtime_state.json")

# In-memory runtime state
db_assets: Dict[str, dict] = {}
db_jobs: List[dict] = []
db_nodes: List[dict] = []
db_edges: List[dict] = []
db_audit_logs: List[dict] = []
db_state_lock = RLock()

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
        backup_path = f"{RUNTIME_STATE_PATH}.bak"
        if not os.path.exists(backup_path):
            return False
        try:
            with open(backup_path, "r", encoding="utf-8") as f:
                payload = json.load(f)
        except Exception:
            return False

    with db_state_lock:
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
    with db_state_lock:
        # Deep-copy before serialising so concurrent scan threads can't mutate
        # the dicts while json.dump is iterating over them.
        payload = {
            "assets": deepcopy(db_assets),
            "jobs": list(db_jobs),
            "nodes": list(db_nodes),
            "edges": list(db_edges),
            "audit_logs": list(db_audit_logs),
            "users": deepcopy(db_users),
        }
        temp_path = f"{RUNTIME_STATE_PATH}.tmp"
        backup_path = f"{RUNTIME_STATE_PATH}.bak"
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        # Windows: os.replace can fail with WinError 32 when the .tmp file is
        # still locked by a concurrent reload process; fall back to direct write.
        try:
            os.replace(temp_path, RUNTIME_STATE_PATH)
        except OSError:
            try:
                os.unlink(temp_path)
            except OSError:
                pass
            with open(RUNTIME_STATE_PATH, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
        try:
            with open(backup_path, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
        except OSError:
            pass


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
