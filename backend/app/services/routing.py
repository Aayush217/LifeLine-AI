import requests
import math

def get_osrm_travel_time(donor_lat, donor_lng, hospital_lat, hospital_lng):
    """
    Uses the free OSRM (Open Source Routing Machine) public API to get
    real-world travel time and distance between two points, acting as a 
    free replacement for the Google Maps Distance Matrix API.
    """
    # OSRM expects coordinates in Longitude,Latitude format
    url = f"http://router.project-osrm.org/route/v1/driving/{donor_lng},{donor_lat};{hospital_lng},{hospital_lat}?overview=false"
    
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data['code'] == 'Ok':
                # OSRM returns duration in seconds and distance in meters
                duration_sec = data['routes'][0]['duration']
                distance_meters = data['routes'][0]['distance']
                return {
                    "distance_km": round(distance_meters / 1000, 2),
                    "duration_mins": math.ceil(duration_sec / 60)
                }
    except Exception as e:
        print(f"OSRM Routing failed: {e}")
    
    # Fallback to Haversine straight-line distance if API fails
    return get_haversine_fallback(donor_lat, donor_lng, hospital_lat, hospital_lng)

def get_haversine_fallback(lat1, lon1, lat2, lon2):
    """
    Simple fallback straight line distance (Haversine Formula)
    Assuming average urban speed of 30km/h for duration fallback
    """
    R = 6371 # Earth radius km
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    lat1 = math.radians(lat1)
    lat2 = math.radians(lat2)

    a = math.sin(dLat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dLon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    distance = R * c
    
    return {
        "distance_km": round(distance, 2),
        "duration_mins": math.ceil((distance / 30) * 60),
        "is_fallback": True
    }
