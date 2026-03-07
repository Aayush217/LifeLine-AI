import joblib
import pandas as pd
import numpy as np
import os

# Load models safely
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
clf_path = os.path.join(BASE_DIR, 'ml_models', 'shortage_classifier.pkl')
reg_path = os.path.join(BASE_DIR, 'ml_models', 'units_regressor.pkl')

try:
    classifier = joblib.load(clf_path)
    regressor = joblib.load(reg_path)
    MODELS_LOADED = True
except Exception as e:
    print(f"Warning: Could not load ML models. Ensure train_models.py has been run. {e}")
    MODELS_LOADED = False

def get_shortage_forecasts():
    """
    Runs live inference using the trained XGBoost and RandomForest models.
    In a real scenario, this would pull live weather/traffic data for specific coordinates.
    Here we simulate passing inputs to the model for specific cities.
    """
    
    # 1. Define 'live' inputs for 3 regions
    # Columns must match training: Recency_Months, Frequency_Times, Monetary_cc, Time_Months, Accident_Risk, Weather_Severity, Is_Weekend
    
    regions = [
        {
            "id": "JPR-N1",
            "name": "Jhotwara Industrial Area",
            "lat": 26.9388,
            "lng": 75.7483,
            "bloodType": "O-",
            "features": [12, 5, 1200, 24, 9, 3, 1] # High accident risk (9)
        },
        {
            "id": "JPR-S2",
            "name": "Malviya Nagar Highway",
            "lat": 26.8530,
            "lng": 75.8174,
            "bloodType": "A+",
            "features": [6, 12, 3500, 48, 4, 6, 0] # Medium risk, severe extreme heat (weather=6)
        },
        {
            "id": "JPR-W3",
            "name": "Vaishali Nagar Clinic Zone",
            "lat": 26.9146,
            "lng": 75.7408,
            "bloodType": "AB-",
            "features": [2, 2, 500, 6, 8, 4, 1] # High risk traffic, moderate weather
        }
    ]

    predictions = []

    for region in regions:
        if MODELS_LOADED:
            # Format inputs for model
            input_data = pd.DataFrame([region["features"]], columns=[
                'Recency_Months', 'Frequency_Times', 'Monetary_cc', 'Time_Months', 
                'Accident_Risk', 'Weather_Severity', 'Is_Weekend'
            ])
            
            # Inference
            is_shortage = classifier.predict(input_data)[0]
            units_needed = int(regressor.predict(input_data)[0])
        else:
            # Fallback if models not found
            is_shortage = 1 if region["features"][4] > 7 else 0
            units_needed = region["features"][4] * 5

        # Format exactly as the Next.js frontend expects
        severity = "Normal"
        if is_shortage == 1 and units_needed > 30:
            severity = "High"
        elif is_shortage == 1:
            severity = "Medium"
        elif units_needed > 10:
             severity = "Low"

        # Generate Explainable AI Reason Based on Features
        reason = []
        if region["features"][4] >= 8: reason.append("Severe Accident Risk Forecast")
        if region["features"][5] >= 4: reason.append("Adverse Weather Conditions")
        if region["features"][6] == 1: reason.append("Historically High-Demand Weekend")
        
        reason_str = " + ".join(reason) if reason else "Routine operational fluctuations."

        # Only broadcast if there is actually a shortage/alert needed
        if severity != "Normal":
            predictions.append({
                "id": region["id"],
                "lat": region["lat"],
                "lng": region["lng"],
                "severity": severity,
                "reason": reason_str,
                "predictedShortage": max(units_needed, 0),
                "bloodType": region["bloodType"],
            })

    return predictions
