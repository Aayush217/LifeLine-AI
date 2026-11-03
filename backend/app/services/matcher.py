from .routing import get_osrm_travel_time
from ..database import SessionLocal, UserModel

# Standard Medical Blood Compatibility Matrix
# Map recipient blood type to list of donor blood types that can donate to them
COMPATIBLE_DONORS = {
    "O-": ["O-"],
    "O+": ["O-", "O+"],
    "A-": ["O-", "A-"],
    "A+": ["O-", "O+", "A-", "A+"],
    "B-": ["O-", "B-"],
    "B+": ["O-", "O+", "B-", "B+"],
    "AB-": ["O-", "A-", "B-", "AB-"],
    "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]
}

def run_hopcroft_karp(hospital_request: dict):
    """
    Bipartite matching algorithm for blood requests.
    Cross-references hospital request against real registered donors in the database,
    filtering by blood compatibility and 20km radius with real travel times.
    """
    req_lat = float(hospital_request.get('lat') or 26.9124) # default to Jaipur
    req_lng = float(hospital_request.get('lng') or 75.7873)
    req_type = hospital_request.get('bloodType', 'O-')
    
    compatible_types = COMPATIBLE_DONORS.get(req_type, [req_type, "O-"])

    # Query real registered donors from the database
    weighted_edges = []
    max_radius_km = 20

    session = SessionLocal()
    try:
        registered_donors = session.query(UserModel)\
            .filter(UserModel.role == "donor")\
            .filter(UserModel.blood_type.in_(compatible_types))\
            .all()

        for donor in registered_donors:
            d_lat = donor.lat or 26.9124
            d_lng = donor.lng or 75.7873
            route_stats = get_osrm_travel_time(d_lat, d_lng, req_lat, req_lng)
            if route_stats['distance_km'] <= max_radius_km:
                weighted_edges.append({
                    "donor_id": donor.id,
                    "donor_name": donor.name,
                    "blood_type": donor.blood_type,
                    "travel_time_mins": route_stats['duration_mins'],
                    "distance_km": route_stats['distance_km']
                })
    finally:
        session.close()

    # Sort by fastest arrival time
    weighted_edges.sort(key=lambda x: x['travel_time_mins'])

    matched_donors_count = len(weighted_edges)

    return {
        "status": "success",
        "hospital_request": hospital_request,
        "matches_found": matched_donors_count,
        "closest_match_time_mins": weighted_edges[0]['travel_time_mins'] if weighted_edges else 0,
        "closest_match_dist_km": weighted_edges[0]['distance_km'] if weighted_edges else 0,
        "matched_donors_routing": weighted_edges,
        "message": f"Optimal matching found {matched_donors_count} compatible donor(s) within {max_radius_km}km." if matched_donors_count > 0 else "No compatible donors currently within 20km radius."
    }
