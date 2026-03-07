# Optimised Blood Donation Matching System Mechanics

Here is the deep dive into exactly how your system calculates values, makes predictions, and matches donors to hospitals. This covers the Machine Learning pipelines as well as the Graph Theory routing.

---

## 1. The Proactive "Brain" (Machine Learning Pipeline)

### What data does the system use?
The system utilizes classical **RFMTC** logic combined with external **Risk Variables**. 
*   **Recency (Months):** How long since the donor last donated.
*   **Frequency (Times):** How many times they have donated in their lifetime.
*   **Monetary (cc):** Total volume of blood donated.
*   **Time (Months):** Time since their *first* donation.
*   **Accident_Risk (1-10 Scale):** A synthetic variable representing real-world traffic data (e.g. 9 = heavy holiday traffic).
*   **Weather_Severity (1-5 Scale):** A synthetic variable representing environmental blockers (e.g. 5 = localized storm/heatwave).
*   **Is_Weekend (0 or 1):** Demand typically spikes and supply typically drops on weekends.

### A. The Classification Engine (Will there be a Shortage?)
*   **Model:** Scikit-Learn `RandomForestClassifier` (acting as a scalable Proxy for SVM).
*   **Logic:** The model is trained to predict a binary outcome: `1` (Shortage Alert) or `0` (Normal).
*   **How it calculates `Target_Shortage`:** If `Accident_Risk` is critical (> 7) AND it is a Weekend `(1)`, or if `Weather_Severity` is extreme (> 4), the model flags the region as `1` (Shortage imminent). This allows the system to send Push Notifications *before* a hospital even records an inventory drop.

### B. The Regression Engine (Exactly how many units do we need?)
*   **Model:** `XGBoost` Regressor (`XGBRegressor`).
*   **Logic:** Once a shortage is flagged, the system needs to know exactly how much blood to request to avoid over-mobilizing donors and wasting blood.
*   **How it calculates `Target_Units_Needed`:** The base rate is multiplied by the risk variables. 
    `Units = (Accident_Risk * 5) + (Weather_Severity * 3) + Random_Noise`
    *(Example: A high accident zone (9) with bad weather (4) would demand (9*5) + (4*3) = 57 units needed).*

---

## 2. The Smart Logistics Engine (Bipartite Matching & Routing)

### Why Hopcroft-Karp?
Most apps use a simple radius query ("Message everyone within 20km"). During a mass-casualty event, this is inefficient and leads to certain donors being spammed while others are ignored.

**Hopcroft-Karp** treats the problem as a **Bipartite Graph**:
1.  **Set U:** Available Donors (from Firebase database).
2.  **Set V:** Hospital Urgent Requests.
3.  **Edges:** The connection between a Donor and a Hospital is valid *only if* the donor is a blood-type match AND within a viable travel time.

The algorithm finds the **Maximum Match**—the exact pairing configuration that ensures the most amount of people arrive at the hospital in the shortest possible global timeframe.

### Real-World Routing (OSRM integration)
We do not use straight-line (Haversine) distance. 10km through a city center takes much longer than 15km on a highway.
*   We use **Open Source Routing Machine (OSRM)** (`http://router.project-osrm.org`).
*   Instead of distance, the Hopcroft-Karp graph edges are weighted by `duration_mins` returned by OSRM.
*   **How it calculates the numbers you see on screen:** When you click "Simulate Request", the Python backend pings the OSRM API with the hospital's coordinate and 3 mock donor coordinates. OSRM calculates the exact driving route based on OpenStreetMap road configurations, returning the ETA in minutes and distance in km, which are then displayed in the `Hopcroft-Karp Match Results` box on the Next.js frontend.
