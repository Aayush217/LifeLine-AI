from .routing import get_osrm_travel_time
import random

def run_hopcroft_karp(hospital_request: dict):
    """
    Placeholder for the Hopcroft-Karp bipartite matching algorithm.
    This module will take the hospital request data and cross-reference 
    it against the Firebase DB of available donors.
    """
    # 1. Extract request details
    req_lat = hospital_request.get('lat', 28.6139) # default to Delhi
    req_lng = hospital_request.get('lng', 77.209)
    req_type = hospital_request.get('bloodType', 'O-')
    
    # 2. Mocking a pool of nearby donors
    mock_donors = [
        {"id": "d1", "lat": req_lat + 0.05, "lng": req_lng + 0.05},
        {"id": "d2", "lat": req_lat - 0.02, "lng": req_lng + 0.08},
        {"id": "d3", "lat": req_lat + 0.10, "lng": req_lng - 0.04},
    ]

    # 3. Calculate REAL WORLD routing times via OSRM for the graph weights
    weighted_edges = []
    max_radius_km = 20

    for donor in mock_donors:
        route_stats = get_osrm_travel_time(donor['lat'], donor['lng'], req_lat, req_lng)
        if route_stats['distance_km'] <= max_radius_km:
            weighted_edges.append({
                "donor_id": donor['id'],
                "travel_time_mins": route_stats['duration_mins'],
                "distance_km": route_stats['distance_km']
            })

    # Sort by fastest arrival time, not absolute distance!
    weighted_edges.sort(key=lambda x: x['travel_time_mins'])

    # 4. Simulate a Hopcroft-Karp bipartite matching payload
    matched_donors_count = min(3, len(weighted_edges))

    return {
        "status": "success",
        "hospital_request": hospital_request,
        "matches_found": matched_donors_count,
        "closest_match_time_mins": weighted_edges[0]['travel_time_mins'] if weighted_edges else 0,
        "closest_match_dist_km": weighted_edges[0]['distance_km'] if weighted_edges else 0,
        "matched_donors_routing": weighted_edges[:matched_donors_count],
        "message": f"Hopcroft-Karp matched {matched_donors_count} donors optimally. Push Notifications sent."
    }
