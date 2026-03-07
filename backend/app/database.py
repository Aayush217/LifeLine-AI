"""
In-memory database for the MVP simulating global state for Jaipur.
"""
from typing import Dict, List, Optional
from datetime import datetime
import uuid

# Users dictionary: { "user_id": { ... user data ... } }
users: Dict[str, dict] = {
    # System administrator account
    "admin": {
        "id": "admin",
        "name": "System Administrator",
        "email": "admin@lifeline.com",
        "password": "admin",
        "role": "admin",
        "location": {"lat": 26.9124, "lng": 75.7873},
        "bloodType": "Any",
        "points": 0,
        "livesSaved": 0
    }
}

# Active requests list
active_requests: List[dict] = []

# Admin warnings list
warnings: List[dict] = []

# Helper functions
def get_user_by_email(email: str) -> Optional[dict]:
    for user in users.values():
        if user["email"] == email:
            return user
    return None

def add_user(user: dict):
    # Ensure ID is unique
    if "id" not in user:
        user["id"] = str(uuid.uuid4())
    # Initialize basic stats
    user["points"] = user.get("points", 0)
    user["livesSaved"] = user.get("livesSaved", 0)
    user["badges"] = user.get("badges", [])
    users[user["id"]] = user
    return user

def get_leaderboard() -> List[dict]:
    donors = [u for u in users.values() if u.get("role") == "donor"]
    donors.sort(key=lambda x: x.get("points", 0), reverse=True)
    # Remove passwords from response
    safe_donors = []
    for d in donors[:10]:
        safe_donor = {k: v for k, v in d.items() if k != "password"}
        safe_donors.append(safe_donor)
    return safe_donors

def add_request(req: dict):
    if "id" not in req:
        req["id"] = f"REQ-{uuid.uuid4().hex[:6].upper()}"
    if "timestamp" not in req:
        req["timestamp"] = datetime.now().isoformat()
    active_requests.append(req)
    return req

def get_all_active_requests():
    # Return requests sorted by newest first
    return sorted(active_requests, key=lambda x: x.get("timestamp", ""), reverse=True)

def accept_request(req_id: str, donor_id: str):
    global active_requests
    req_to_accept = next((r for r in active_requests if r["id"] == req_id), None)
    if req_to_accept:
        if "accepted_donors" not in req_to_accept:
            req_to_accept["accepted_donors"] = []
        if donor_id not in req_to_accept["accepted_donors"]:
            req_to_accept["accepted_donors"].append(donor_id)
            # Optionally increment matches so the hospital dashboard visualizes it
            req_to_accept["matches"] = req_to_accept.get("matches", 0) + 1
        return req_to_accept
    return None

def close_request(req_id: str, donor_id: Optional[str] = None):
    global active_requests
    req_to_close = next((r for r in active_requests if r["id"] == req_id), None)
    if req_to_close:
        # Remove from active
        active_requests = [r for r in active_requests if r["id"] != req_id]
        
        # Credit points to donor if specified (e.g., they responded and arrived)
        if donor_id and donor_id in users:
            points_awarded = req_to_close.get("unitsNeeded", 1) * 50
            lives_awarded = req_to_close.get("unitsNeeded", 1) * 3
            
            users[donor_id]["points"] += points_awarded
            users[donor_id]["livesSaved"] += lives_awarded
            
            # Simple badge logic based on lifetime points
            if users[donor_id]["points"] >= 500 and "First Blood" not in users[donor_id]["badges"]:
                 users[donor_id]["badges"].append("First Blood")
            if users[donor_id]["points"] >= 2000 and "Silver Saver" not in users[donor_id]["badges"]:
                 users[donor_id]["badges"].append("Silver Saver")
                 
        return req_to_close
    return None

def add_warning(warning: dict):
    if "id" not in warning:
        warning["id"] = f"WARN-{uuid.uuid4().hex[:6].upper()}"
    if "timestamp" not in warning:
        warning["timestamp"] = datetime.now().isoformat()
    warnings.append(warning)
    return warning

def get_warnings():
    return sorted(warnings, key=lambda x: x.get("timestamp", ""), reverse=True)
