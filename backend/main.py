"""
FastAPI Backend — Risk Analysis API

Run:
    uvicorn main:app --reload --port 8000

Endpoints:
  POST /api/predict-risk        → predict risk level + factors
  POST /api/recommendations     → personalized recommendations
  GET  /api/model-metrics       → model accuracy / feature importance
  GET  /api/health              → health check
  POST /api/insights            → aggregated stats for dashboard charts
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
import sys
import os

# Add ML module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "ml"))

from inference import predict_risk, get_recommendations, get_model_metrics

# ─── APP SETUP ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="Risk Analysis API",
    description="ML-powered health risk analysis and recommendation engine",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── SCHEMAS ─────────────────────────────────────────────────────────────────

class UserInput(BaseModel):
    # Numeric fields
    Age:                               float = Field(..., ge=18, le=100)
    Heart_Rate:                        float = Field(..., ge=40, le=200)
    Respiration_Rate:                  float = Field(..., ge=8,  le=40)
    Blood_Pressure_Systolic:           float = Field(..., ge=80, le=200)
    Blood_Pressure_Diastolic:          float = Field(..., ge=50, le=130)
    Sleep_Duration_Hours:              float = Field(..., ge=0,  le=24)
    Active_Hours_Per_Day:              float = Field(..., ge=0,  le=24)
    Screen_Time_Hours:                 float = Field(..., ge=0,  le=24)
    Caffeine_Intake_mg:                float = Field(..., ge=0,  le=1000)
    Stress_Level:                      float = Field(..., ge=1,  le=10)
    Deadline_Facing_Per_Month:         float = Field(..., ge=0,  le=30)
    Physical_Activity_Sessions_Per_Week: float = Field(..., ge=0, le=14)
    Water_Intake_Liters:               float = Field(..., ge=0,  le=10)
    Mood_Rating:                       float = Field(..., ge=1,  le=10)
    Social_Interaction_Score:          float = Field(..., ge=1,  le=10)
    Productivity_Score:                float = Field(..., ge=1,  le=10)

    # Categorical fields
    Gender:                 str = Field(..., pattern="^(Male|Female|Other)$")
    Mental_Health_History:  str = Field(..., pattern="^(Yes|No)$")
    Any_Disease:            Optional[str] = Field(default="None")
    Due_To_Stress:          str = Field(..., pattern="^(Financial|Unknown|Workload|Academic|Family)$")
    Hydration_Category:     str = Field(..., pattern="^(High|Medium|Low)$")
    Age_Group:              str = Field(..., pattern="^(18-21|22-25|26-29|30-40|40\\+)$")


class PredictResponse(BaseModel):
    risk_level: str
    probabilities: dict
    top_factors: List[dict]
    confidence: float


class RecommendationResponse(BaseModel):
    risk_level: str
    recommendations: List[dict]
    top_factors: List[dict]
    probabilities: dict


# ─── ROUTES ──────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Risk Analysis API v1.0"}


@app.post("/api/predict-risk", response_model=PredictResponse)
def api_predict_risk(payload: UserInput):
    try:
        result = predict_risk(payload.dict())
        return result
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="Model artifacts not found. Run train_model.py first."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/recommendations", response_model=RecommendationResponse)
def api_recommendations(payload: UserInput):
    try:
        result = get_recommendations(payload.dict())
        return result
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="Model artifacts not found. Run train_model.py first."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/model-metrics")
def api_model_metrics():
    try:
        return get_model_metrics()
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="Model metrics not found. Run train_model.py first."
        )


@app.post("/api/insights")
def api_insights(payload: UserInput):
    """
    Return aggregated/computed insights for the Dashboard tab.
    Computes derived scores, risk indicators, and trend data from user inputs.
    """
    d = payload.dict()

    # Derived scores
    sleep_score = min(100, (d["Sleep_Duration_Hours"] / 8) * 100)
    activity_score = min(100, (d["Active_Hours_Per_Day"] / 3) * 100)
    hydration_score = min(100, (d["Water_Intake_Liters"] / 3) * 100)
    stress_score = max(0, 100 - (d["Stress_Level"] - 1) * 11.1)
    screen_score = max(0, 100 - max(0, d["Screen_Time_Hours"] - 4) * 10)

    wellness_score = round(
        (sleep_score * 0.25 + activity_score * 0.20 +
         hydration_score * 0.15 + stress_score * 0.25 +
         screen_score * 0.15), 1
    )

    radar_data = [
        {"metric": "Sleep",       "value": round(sleep_score, 1),     "fullMark": 100},
        {"metric": "Activity",    "value": round(activity_score, 1),   "fullMark": 100},
        {"metric": "Hydration",   "value": round(hydration_score, 1),  "fullMark": 100},
        {"metric": "Stress Ctrl", "value": round(stress_score, 1),     "fullMark": 100},
        {"metric": "Screen Ctrl", "value": round(screen_score, 1),     "fullMark": 100},
        {"metric": "Mood",        "value": round(d["Mood_Rating"] * 10, 1), "fullMark": 100},
        {"metric": "Productivity","value": round(d["Productivity_Score"] * 10, 1), "fullMark": 100},
    ]

    vitals = [
        {"name": "Heart Rate",    "value": d["Heart_Rate"],                "unit": "bpm",  "normal": "60-100",   "status": "normal" if 60 <= d["Heart_Rate"] <= 100 else "warning"},
        {"name": "BP Systolic",   "value": d["Blood_Pressure_Systolic"],   "unit": "mmHg", "normal": "90-120",   "status": "normal" if d["Blood_Pressure_Systolic"] <= 120 else "warning"},
        {"name": "BP Diastolic",  "value": d["Blood_Pressure_Diastolic"],  "unit": "mmHg", "normal": "60-80",    "status": "normal" if d["Blood_Pressure_Diastolic"] <= 80 else "warning"},
        {"name": "Respiration",   "value": d["Respiration_Rate"],          "unit": "/min", "normal": "12-20",    "status": "normal" if 12 <= d["Respiration_Rate"] <= 20 else "warning"},
    ]

    bar_data = [
        {"category": "Stress",     "yours": d["Stress_Level"],                         "ideal": 3},
        {"category": "Sleep (h)",  "yours": d["Sleep_Duration_Hours"],                 "ideal": 8},
        {"category": "Activity",   "yours": d["Active_Hours_Per_Day"],                 "ideal": 2},
        {"category": "Screen (h)", "yours": d["Screen_Time_Hours"],                    "ideal": 4},
        {"category": "Caffeine/100","yours": round(d["Caffeine_Intake_mg"] / 100, 1),  "ideal": 2},
        {"category": "Water (L)",  "yours": d["Water_Intake_Liters"],                  "ideal": 2.5},
    ]

    return {
        "wellness_score": wellness_score,
        "radar_data":     radar_data,
        "vitals":         vitals,
        "bar_comparison": bar_data,
        "mood":           d["Mood_Rating"],
        "productivity":   d["Productivity_Score"],
        "social":         d["Social_Interaction_Score"],
    }
