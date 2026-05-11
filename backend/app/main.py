from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from .services import ml_prediction, matcher
from .database import (
    users, 
    get_user_by_email, 
    add_user, 
    get_leaderboard, 
    add_request, 
    close_request,
    get_all_active_requests,
    accept_request,
    add_warning,
    get_warnings,
    add_proactive_donation,
    get_proactive_donations
)

app = FastAPI(title="LifeLine AI Backend", version="1.0.0")

# Configure CORS so the Next.js frontend can connect
# Allows both local dev (localhost:3000) and any Vercel production domain
ORIGINS = [
    "http://localhost:3000",
    "https://lifelineai-one.vercel.app",   # actual Vercel deployment URL
    "https://lifeline-ai.vercel.app",      # legacy URL (keep for safety)
    "https://*.vercel.app",                # allow all Vercel preview deployments
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",  # matches all vercel preview URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "LifeLine AI Hub is running"}

@app.get("/api/predictions")
def get_predictions():
    """
    Returns the AI predictions for the frontend map.
    This routes to the ML microservice which runs SVM/XGBoost logic.
    """
    return ml_prediction.get_shortage_forecasts()

@app.post("/api/match")
def trigger_match(request_payload: dict):
    """
    Takes a Hospital Request (Blood Type, Location) and returns
    the maximum match from available donors within a 20km radius 
    using the Hopcroft-Karp algorithm.
    """
    return matcher.run_hopcroft_karp(request_payload)

# --- AUTHENTICATION ENDPOINTS ---

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str # 'donor' or 'hospital'
    bloodType: str = "Unknown"
    lat: float = 26.9124 # Default to Jaipur Center
    lng: float = 75.7873 # Default to Jaipur Center

@app.post("/api/auth/login")
def login(req: LoginRequest):
    user = get_user_by_email(req.email)
    if not user or user.get("password") != req.password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    
    # Return user safe object
    safe_user = {k: v for k, v in user.items() if k != "password"}
    return {"message": "Login successful", "user": safe_user}

@app.post("/api/auth/register")
def register(req: RegisterRequest):
    if get_user_by_email(req.email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
        
    new_user = {
        "name": req.name,
        "email": req.email,
        "password": req.password,
        "role": req.role,
        "bloodType": req.bloodType,
        "location": {"lat": req.lat, "lng": req.lng},
        "points": 0,
        "livesSaved": 0,
        "badges": []
    }
    
    user = add_user(new_user)
    safe_user = {k: v for k, v in user.items() if k != "password"}
    return {"message": "Registration successful", "user": safe_user}

# --- GLOBAL STATE ENDPOINTS ---

@app.get("/api/leaderboard")
def get_leaderboard_route():
    return get_leaderboard()

@app.get("/api/requests/active")
def get_active_requests():
    return get_all_active_requests()

class CloseRequestModel(BaseModel):
    donor_id: Optional[str] = None

@app.post("/api/requests/{request_id}/close")
def close_request_route(request_id: str, payload: CloseRequestModel):
    closed_req = close_request(request_id, payload.donor_id)
    if not closed_req:
        raise HTTPException(status_code=404, detail="Request not found or already closed")
    return {"message": "Request closed successfully", "closed_request": closed_req}

class AcceptRequestModel(BaseModel):
    donor_id: str

@app.post("/api/requests/{request_id}/accept")
def accept_request_route(request_id: str, payload: AcceptRequestModel):
    accepted_req = accept_request(request_id, payload.donor_id)
    if not accepted_req:
        raise HTTPException(status_code=404, detail="Request not found or already closed by hospital")
    return {"message": "Accepted Match", "request": accepted_req}

@app.post("/api/requests")
def broadcast_request(req: dict):
    # This endpoint gets hit when a Hospital submits a new dispatch form
    # Run the Hopcroft Karp first
    match_result = matcher.run_hopcroft_karp({
        "lat": req.get("lat"),
        "lng": req.get("lng"),
        "bloodType": req.get("bloodType")
    })
    
    # Register the request into the global active db
    new_req = add_request({
        "hospital_id": req.get("hospital_id"), # Optional
        "bloodType": req.get("bloodType"),
        "unitsNeeded": req.get("unitsNeeded"),
        "urgency": req.get("urgency"),
        "lat": req.get("lat"),
        "lng": req.get("lng"),
        "matches": match_result.get("matches_found", 0),
        "eta": match_result.get("closest_match_time_mins", 0),
        "routingDetails": match_result.get("matched_donors_routing", [])
    })
    
    # Return both the match results & the new request state
    return {
        "message": match_result.get("message"),
        "matches_found": match_result.get("matches_found", 0),
        "closest_match_time_mins": match_result.get("closest_match_time_mins", 0),
        "matched_donors_routing": match_result.get("matched_donors_routing", []),
        "request_ticket": new_req
    }

# --- ADMIN WARNING ENDPOINTS ---

@app.get("/api/warnings")
def get_warnings_route():
    return get_warnings()

class WarningRequest(BaseModel):
    region_id: str
    bloodType: str
    message: str
    severity: str = "High"

@app.post("/api/warnings")
def create_warning(req: WarningRequest):
    return add_warning({
        "region_id": req.region_id,
        "bloodType": req.bloodType,
        "message": req.message,
        "severity": req.severity
    })

# --- PROACTIVE DONATIONS ENDPOINTS ---

class ProactiveDonationRequest(BaseModel):
    donor_id: str
    hospital_id: str
    hospital_name: str
    bloodType: str

@app.post("/api/donations/proactive")
def create_proactive_donation(req: ProactiveDonationRequest):
    return add_proactive_donation({
        "donor_id": req.donor_id,
        "hospital_id": req.hospital_id,
        "hospital_name": req.hospital_name,
        "bloodType": req.bloodType,
        "status": "Scheduled"
    })

@app.get("/api/donations/proactive")
def get_proactive_donations_route():
    return get_proactive_donations()
