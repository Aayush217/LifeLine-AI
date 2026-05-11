# LifeLine AI: Predictive Blood Donation & Logistics Network

## Overview
Current blood bank systems rely on slow, reactive methods—spamming donors in a "dumb radius" only *after* a shortage hits. 

LifeLine AI revolutionizes the blood donation supply chain using **Machine Learning** and **Graph Theory**. Instead of waiting for an emergency, the system predicts shortages before they happen based on real-world risk factors. When a hospital issues an urgent request, it mathematically calculates the perfect set of donors to dispatch based on actual traffic ETA instead of geographic distance.

## Key Innovations

### 1. The Proactive Brain (Machine Learning Pipeline)
- **Predictive Modeling:** Uses a custom dataset based on `RFMTC` variables combined with modern environmental factors (`Accident_Risk`, `Weather_Severity`, `Is_Weekend`).
- **Classification Engine (RandomForest):** Predicts *if* a region will experience a shortage based on spikes in accident risk or severe weather. 
- **Regression Engine (XGBoost):** Calculates *exactly* how many units of blood need to be mobilized to restock the local Cold Chain FIFO before a crisis occurs without over-drafting donors.

### 2. The Smart Logistics Engine (Graph Matching)
- **Hopcroft-Karp Bipartite Matching:** Replaces the "SMS blast to everyone" problem. It treats the hospital request and the available donor pool as a bipartite graph, finding the mathematically perfect "Maximum Match" of donors to fulfill the exact unit requirements.
- **Open Source Routing Machine (OSRM):** Discards straight-line "Haversine" distance. The system pings OSRM to calculate actual driving time on road networks, prioritizing donors with a faster traffic ETA over those who are physically closer but stuck in gridlock.

## Features
- **Admin Command Portal:** Live-updating prediction map showing localized AI "Radar" shortages in real-time alongside active Hopcroft-Karp hospital dispatch nodes. Built with Next.js and Leaflet maps.
- **Hospital Dispatch Portal:** Cold Chain unit tracking and instant "Urgent Request" broadcasting that directly pings the Hopcroft-Karp algorithm.
- **Donor Portal:** An interactive dashboard where donors can see real-time match requests targeting them based on their exact coordinate ETA, alongside gamification/leaderboard systems tracking lives saved.

## Tech Stack
- **Frontend:** Next.js (App Router), React, Tailwind CSS, shadcn/ui, Leaflet (React-Leaflet)
- **Backend:** Python FastAPI, Scikit-Learn, XGBoost, Uvicorn
- **Algorithms:** Hopcroft-Karp Bipartite Matching, OSRMs (Open Source Routing Machine)

## Getting Started

### Backend Setup (Machine Learning & APIs)
1. Navigate to the `backend` folder.
2. Initialize virtual environment: `python -m venv .venv` and activate it.
3. Install dependencies: `pip install fastapi uvicorn scikit-learn xgboost pandas numpy`
4. Run the ML Training pipeline: `python train_models.py` (Generates the `.pkl` models).
5. Start the server: `uvicorn app.main:app --reload --port 8000`

### Frontend Setup (Web App)
1. Navigate to the `frontend` folder.
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Visit `localhost:3000` and login to the different portals!
   - **Admin Login:** `admin@lifeline.com` (pw: `admin`)

   ┌──────────────────────────────────────────────────────────────┐
│                     LIFE LINE AI SYSTEM                     │
│      Predictive Blood Donation & Logistics Network          │
└──────────────────────────────────────────────────────────────┘


                    ┌──────────────────────┐
                    │  External Datasets   │
                    │----------------------│
                    │ • Accident Risk      │
                    │ • Weather Severity   │
                    │ • Traffic Density    │
                    │ • Weekend/Holiday    │
                    │ • Historical Demand  │
                    └──────────┬───────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│              MACHINE LEARNING PREDICTION ENGINE             │
├──────────────────────────────────────────────────────────────┤
│ 1. Classification Model (Random Forest)                     │
│    → Predicts Blood Shortage Probability                    │
│                                                             │
│ 2. Regression Model (XGBoost)                               │
│    → Predicts Exact Blood Units Required                    │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│             SHORTAGE / EMERGENCY DETECTED                   │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│            HOSPITAL REQUEST & BLOOD REQUIREMENT             │
├──────────────────────────────────────────────────────────────┤
│ • Blood Group Needed                                        │
│ • Units Required                                            │
│ • Hospital Location                                         │
│ • Emergency Priority                                        │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│             DONOR MATCHING ENGINE (GRAPH THEORY)            │
├──────────────────────────────────────────────────────────────┤
│ Hopcroft-Karp Bipartite Matching Algorithm                  │
│                                                             │
│ • Creates Hospital ↔ Donor Graph                            │
│ • Finds Maximum Optimal Match                               │
│ • Prevents Spam Broadcasting                                │
│ • Selects Only Eligible Nearby Donors                       │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│            SMART ROUTING & ETA CALCULATION                  │
├──────────────────────────────────────────────────────────────┤
│ OSRM (Open Source Routing Machine)                          │
│                                                             │
│ • Calculates Real Road Distance                             │
│ • Uses Traffic-aware ETA                                    │
│ • Avoids Gridlocks                                          │
│ • Prioritizes Faster Arrival Time                           │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼

┌───────────────────────┐        ┌──────────────────────────┐
│   HOSPITAL PORTAL     │        │      DONOR PORTAL        │
├───────────────────────┤        ├──────────────────────────┤
│ • Emergency Requests  │        │ • Match Notifications    │
│ • Blood Tracking      │        │ • Live ETA               │
│ • Unit Monitoring     │        │ • Donation Dashboard     │
│ • Admin Dispatch      │        │ • Rewards & Gamification │
└───────────┬───────────┘        └────────────┬─────────────┘
            │                                  │
            └──────────────┬───────────────────┘
                           ▼

┌──────────────────────────────────────────────────────────────┐
│                 REAL-TIME ADMIN DASHBOARD                   │
├──────────────────────────────────────────────────────────────┤
│ • AI Prediction Heatmap                                     │
│ • Live Emergency Monitoring                                 │
│ • Dispatch Coordination                                     │
│ • Active Donor Tracking                                     │
│ • Blood Supply Analytics                                    │
└──────────────────────────────────────────────────────────────┘
