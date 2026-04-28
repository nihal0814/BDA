"""
Inference module — loaded once at backend startup.
Exposes: predict_risk(form_data) -> dict
         get_recommendations(form_data) -> dict
"""

import os
import pickle
import json
import numpy as np
from typing import Dict, Any, List, Tuple

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")

# ─── SINGLETON LOAD ──────────────────────────────────────────────────────────

_model          = None
_label_encoders = None
_target_encoder = None
_feature_names  = None
_metrics        = None


def _load():
    global _model, _label_encoders, _target_encoder, _feature_names, _metrics
    if _model is not None:
        return

    with open(os.path.join(ARTIFACTS_DIR, "risk_model.pkl"), "rb") as f:
        _model = pickle.load(f)
    with open(os.path.join(ARTIFACTS_DIR, "label_encoders.pkl"), "rb") as f:
        _label_encoders = pickle.load(f)
    with open(os.path.join(ARTIFACTS_DIR, "target_encoder.pkl"), "rb") as f:
        _target_encoder = pickle.load(f)
    with open(os.path.join(ARTIFACTS_DIR, "feature_names.pkl"), "rb") as f:
        _feature_names = pickle.load(f)
    with open(os.path.join(ARTIFACTS_DIR, "metrics.json"), "r") as f:
        _metrics = json.load(f)


CATEGORICAL_COLS = [
    "Gender", "Mental_Health_History", "Any_Disease",
    "Due_To_Stress", "Hydration_Category", "Age_Group"
]


def _encode_input(form_data: Dict[str, Any]) -> np.ndarray:
    _load()
    row = []
    for feat in _feature_names:
        val = form_data.get(feat)
        if feat in CATEGORICAL_COLS:
            le = _label_encoders[feat]
            val_str = str(val) if val is not None else "None"
            try:
                val_enc = le.transform([val_str])[0]
            except ValueError:
                val_enc = 0          # unknown category → default
            row.append(val_enc)
        else:
            row.append(float(val) if val is not None else 0.0)
    return np.array(row).reshape(1, -1)


# ─── PUBLIC API ──────────────────────────────────────────────────────────────

def predict_risk(form_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Returns:
      {
        "risk_level": "High" | "Medium" | "Low",
        "probabilities": {"High": 0.xx, "Medium": 0.xx, "Low": 0.xx},
        "top_factors": [{"feature": str, "impact": float, "direction": str}, …],
        "confidence": float
      }
    """
    _load()
    X = _encode_input(form_data)
    pred_idx  = _model.predict(X)[0]
    risk_label = _target_encoder.inverse_transform([pred_idx])[0]

    proba = _model.predict_proba(X)[0]
    classes = _target_encoder.inverse_transform(np.arange(len(_target_encoder.classes_)))
    prob_map = dict(zip(classes, [round(float(p), 4) for p in proba]))

    # Top contributing features (feature importances × input deviation)
    top_factors = _get_top_factors(form_data, risk_label)

    return {
        "risk_level":    risk_label,
        "probabilities": prob_map,
        "top_factors":   top_factors,
        "confidence":    round(float(max(proba)), 4),
    }


def get_recommendations(form_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Returns personalised health/lifestyle recommendations based on inputs.
    """
    _load()
    risk_result = predict_risk(form_data)
    risk_level  = risk_result["risk_level"]
    recs        = _build_recommendations(form_data, risk_level, risk_result["top_factors"])

    return {
        "risk_level":      risk_level,
        "recommendations": recs,
        "top_factors":     risk_result["top_factors"],
        "probabilities":   risk_result["probabilities"],
    }


def get_model_metrics() -> Dict[str, Any]:
    _load()
    return _metrics


# ─── INTERNAL HELPERS ────────────────────────────────────────────────────────

def _get_top_factors(form_data: Dict[str, Any], risk_label: str) -> List[Dict]:
    """Map model feature importances to human-readable factors."""
    if _metrics is None or "feature_importances" not in _metrics:
        return []

    fi_map = dict(_metrics["feature_importances"])
    results = []

    THRESHOLDS = {
        "Stress_Level":                      (7, "high"),
        "Heart_Rate":                        (90, "high"),
        "Sleep_Duration_Hours":              (6, "low"),
        "Screen_Time_Hours":                 (8, "high"),
        "Caffeine_Intake_mg":                (300, "high"),
        "Active_Hours_Per_Day":              (1, "low"),
        "Water_Intake_Liters":               (2, "low"),
        "Mood_Rating":                       (4, "low"),
        "Social_Interaction_Score":          (4, "low"),
        "Physical_Activity_Sessions_Per_Week": (2, "low"),
        "Productivity_Score":                (4, "low"),
        "Blood_Pressure_Systolic":           (130, "high"),
        "Deadline_Facing_Per_Month":         (10, "high"),
    }

    for feat, (threshold, direction) in THRESHOLDS.items():
        val = form_data.get(feat)
        if val is None or feat not in fi_map:
            continue
        val = float(val)
        flag = (direction == "high" and val > threshold) or \
               (direction == "low"  and val < threshold)
        if flag:
            results.append({
                "feature":   feat.replace("_", " "),
                "value":     val,
                "threshold": threshold,
                "direction": direction,
                "impact":    round(fi_map.get(feat, 0), 4),
            })

    results.sort(key=lambda x: x["impact"], reverse=True)
    return results[:6]


def _build_recommendations(form_data, risk_level, top_factors) -> List[Dict]:
    recs = []

    stress = float(form_data.get("Stress_Level", 5))
    sleep  = float(form_data.get("Sleep_Duration_Hours", 7))
    water  = float(form_data.get("Water_Intake_Liters", 2))
    screen = float(form_data.get("Screen_Time_Hours", 5))
    active = float(form_data.get("Active_Hours_Per_Day", 1))
    caffeine = float(form_data.get("Caffeine_Intake_mg", 200))
    mood   = float(form_data.get("Mood_Rating", 5))
    bp_sys = float(form_data.get("Blood_Pressure_Systolic", 120))
    activity_sessions = float(form_data.get("Physical_Activity_Sessions_Per_Week", 3))

    if stress > 7:
        recs.append({
            "category": "Stress Management",
            "icon": "🧘",
            "priority": "High",
            "title": "Reduce Stress Urgently",
            "description": "Your stress level is critically high. Practice mindfulness meditation (10 min/day), deep breathing exercises (4-7-8 technique), and progressive muscle relaxation.",
            "action_steps": ["10 min morning meditation", "5-min breathing breaks every 2 hrs", "Journaling before bed"],
        })
    elif stress > 5:
        recs.append({
            "category": "Stress Management",
            "icon": "🧘",
            "priority": "Medium",
            "title": "Manage Stress Proactively",
            "description": "Moderate stress detected. Incorporate relaxation techniques into your daily routine.",
            "action_steps": ["Evening walk or yoga", "Limit news consumption", "Social bonding activities"],
        })

    if sleep < 6:
        recs.append({
            "category": "Sleep",
            "icon": "😴",
            "priority": "High",
            "title": "Improve Sleep Urgently",
            "description": f"You're sleeping only {sleep:.1f} hrs. Adults need 7-9 hours. Sleep deprivation increases cardiovascular and mental health risk.",
            "action_steps": ["Fixed sleep/wake schedule", "No screens 1hr before bed", "Dark, cool room (18-20°C)"],
        })
    elif sleep < 7:
        recs.append({
            "category": "Sleep",
            "icon": "😴",
            "priority": "Medium",
            "title": "Optimize Sleep Quality",
            "description": "Slightly below recommended sleep. Small changes can improve quality significantly.",
            "action_steps": ["Sleep by 11pm", "Avoid caffeine after 3pm", "15-min wind-down routine"],
        })

    if active < 1:
        recs.append({
            "category": "Physical Activity",
            "icon": "🏃",
            "priority": "High",
            "title": "Increase Daily Movement",
            "description": "Very low physical activity. Even 30 min of brisk walking reduces cardiovascular risk by 35%.",
            "action_steps": ["30-min walk daily", "Take stairs instead of elevator", "Desk stretches every hour"],
        })
    elif activity_sessions < 3:
        recs.append({
            "category": "Physical Activity",
            "icon": "🏃",
            "priority": "Medium",
            "title": "Increase Exercise Sessions",
            "description": "Aim for at least 3-4 exercise sessions per week mixing cardio and strength.",
            "action_steps": ["2× cardio (running/cycling)", "2× strength training", "1× flexibility/yoga"],
        })

    if water < 2:
        recs.append({
            "category": "Hydration",
            "icon": "💧",
            "priority": "Medium",
            "title": "Increase Water Intake",
            "description": f"You're consuming only {water:.1f}L. Target 2.5-3L/day for optimal body function.",
            "action_steps": ["Water bottle at desk", "Glass of water before each meal", "Herbal tea counts too"],
        })

    if screen > 8:
        recs.append({
            "category": "Screen Time",
            "icon": "📱",
            "priority": "Medium",
            "title": "Reduce Screen Exposure",
            "description": f"{screen:.1f} hrs of daily screen time strains eyes and disrupts circadian rhythm.",
            "action_steps": ["20-20-20 rule (break every 20min)", "App usage limits on phone", "Screen-free meals"],
        })

    if caffeine > 300:
        recs.append({
            "category": "Diet",
            "icon": "☕",
            "priority": "Medium",
            "title": "Reduce Caffeine Intake",
            "description": f"{caffeine:.0f}mg caffeine/day is above safe limits (≤300mg). This increases anxiety and heart rate.",
            "action_steps": ["Replace afternoon coffee with green tea", "Gradually cut by 50mg/week", "Hydrate more"],
        })

    if bp_sys > 130:
        recs.append({
            "category": "Cardiovascular",
            "icon": "❤️",
            "priority": "High",
            "title": "Monitor Blood Pressure",
            "description": f"Systolic BP of {bp_sys:.0f}mmHg is elevated. Consult a doctor and adopt DASH diet.",
            "action_steps": ["Reduce sodium intake", "Regular aerobic exercise", "Doctor consultation recommended"],
        })

    if mood < 4:
        recs.append({
            "category": "Mental Health",
            "icon": "🌱",
            "priority": "High",
            "title": "Prioritize Mental Wellbeing",
            "description": "Low mood rating detected. Mental health directly impacts physical health outcomes.",
            "action_steps": ["Consider counseling/therapy", "Daily gratitude practice", "Connect with friends/family"],
        })

    # Generic risk-level tip
    if risk_level == "High":
        recs.append({
            "category": "General",
            "icon": "🏥",
            "priority": "High",
            "title": "Schedule a Health Checkup",
            "description": "Your risk profile suggests a comprehensive health checkup is recommended within 1 month.",
            "action_steps": ["Blood work panel", "BP & ECG check", "Mental health screening"],
        })

    recs.sort(key=lambda x: {"High": 0, "Medium": 1, "Low": 2}[x["priority"]])
    return recs
