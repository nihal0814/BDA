"""
FastAPI Backend — Risk Analysis API

Run:
    uvicorn main:app --reload --port 8000

Env:
    Set HF_API_KEY (Hugging Face access token) to enable the Mistral chat endpoint.

Notes:
        The Mistral endpoints can run without ML dependencies installed.
        The local ML fallback requires numpy/pandas/scikit-learn + trained artifacts.

Endpoints:
  POST /api/predict-risk        → predict risk level + factors
  POST /api/recommendations     → personalized recommendations
  GET  /api/model-metrics       → model accuracy / feature importance
  GET  /api/health              → health check
  POST /api/insights            → aggregated stats for dashboard charts
    POST /api/chat                → wellness chat powered by Mistral (via HF router)
    POST /api/gemini/chat         → deprecated alias for /api/chat
    POST /api/claude/chat         → deprecated alias for /api/chat
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
import sys
import os
import json
import ast

# Optional (used for Mistral chat endpoint via HF router)
try:
    from openai import OpenAI
except Exception:
    OpenAI = None

# Load environment variables from backend/.env if present.
# This keeps local setup simple (especially on Windows) without requiring
# manual shell exports.
try:
    from dotenv import load_dotenv

    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except Exception:
    pass

# Add ML module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "ml"))


def _is_local_ml_enabled() -> bool:
    v = (os.environ.get("ENABLE_LOCAL_ML") or "").strip().lower()
    return v in {"1", "true", "yes", "on"}


def _load_ml_functions():
    """Import ML helpers lazily.

    This keeps the FastAPI server usable for non-ML endpoints (like Mistral chat)
    even when heavy ML dependencies aren't installed yet.
    """

    if not _is_local_ml_enabled():
        raise HTTPException(
            status_code=503,
            detail=(
                "Local ML endpoints are disabled in this backend. "
                "Set ENABLE_LOCAL_ML=1 to enable the built-in model endpoints."
            ),
        )

    try:
        from inference import predict_risk, get_recommendations, get_model_metrics
        return predict_risk, get_recommendations, get_model_metrics
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=(
                "ML dependencies are not available in the backend environment. "
                "Install the backend requirements (numpy/pandas/scikit-learn, etc.) "
                f"to enable risk endpoints. Root error: {e}"
            ),
        )

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


class LlmChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=8000)


class ChatRequest(BaseModel):
    system: str = Field(default="", max_length=8000)
    messages: List[LlmChatMessage] = Field(..., min_length=1, max_length=40)
    model: Optional[str] = Field(default=None, max_length=200)
    max_tokens: int = Field(default=1000, ge=1, le=4096)
    temperature: float = Field(default=0.7, ge=0.0, le=1.0)


class ChatResponse(BaseModel):
    model: str
    content: str
    usage: Optional[dict] = None


def _get_hf_api_key() -> Optional[str]:
    key = (
        os.environ.get("HF_API_KEY")
        or os.environ.get("HUGGINGFACEHUB_API_TOKEN")
        or os.environ.get("HUGGINGFACE_API_KEY")
    )
    if key and str(key).strip():
        return str(key)

    # If the server was started before backend/.env was filled in, Uvicorn reload may not
    # notice .env changes. Best-effort: reload backend/.env and check again.
    try:
        dotenv_loader = load_dotenv  # type: ignore[name-defined]
    except Exception:
        dotenv_loader = None

    if dotenv_loader is not None:
        try:
            dotenv_loader(os.path.join(os.path.dirname(__file__), ".env"), override=False)
        except Exception:
            pass

    key = (
        os.environ.get("HF_API_KEY")
        or os.environ.get("HUGGINGFACEHUB_API_TOKEN")
        or os.environ.get("HUGGINGFACE_API_KEY")
    )
    return str(key) if key and str(key).strip() else None


def _mistral_chat_completion(
    *,
    api_key: str,
    model: str,
    system: str,
    messages: List[LlmChatMessage],
    max_tokens: int,
    temperature: float,
) -> tuple[str, Optional[dict]]:
    if OpenAI is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "OpenAI client library is not installed. Install backend requirements "
                "(including 'openai') to enable the Mistral chat endpoint."
            ),
        )

    client = OpenAI(
        base_url="https://router.huggingface.co/v1",
        api_key=api_key,
    )

    openai_messages: list[dict] = []
    if system:
        openai_messages.append({"role": "system", "content": system})

    for m in messages:
        # Roles are already OpenAI-compatible: user/assistant
        openai_messages.append({"role": m.role, "content": m.content})

    try:
        completion = client.chat.completions.create(
            model=model,
            messages=openai_messages,
            max_tokens=int(max_tokens),
            temperature=float(temperature),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Mistral request failed: {e}")

    content = None
    try:
        content = completion.choices[0].message.content
    except Exception:
        content = None

    if not isinstance(content, str) or not content.strip():
        content = "Sorry, I couldn't generate a response."

    usage = None
    try:
        if getattr(completion, "usage", None) is not None:
            usage_obj = completion.usage
            usage = usage_obj.model_dump() if hasattr(usage_obj, "model_dump") else dict(usage_obj)
    except Exception:
        usage = None

    return content.strip(), usage


def _parse_llm_json(text: str) -> dict:
    d = _extract_json_dict(text)
    if not isinstance(d, dict):
        raise HTTPException(status_code=502, detail="LLM did not return valid JSON.")
    return d


def _normalize_probabilities(probabilities: Optional[dict], *, risk_level: Optional[str]) -> dict:
    base = {"High": 0.0, "Medium": 0.0, "Low": 0.0}
    if isinstance(probabilities, dict):
        for k in list(base.keys()):
            v = probabilities.get(k)
            try:
                if v is None:
                    continue
                base[k] = float(v)
            except Exception:
                pass

    # If still empty, make a reasonable default distribution.
    if sum(base.values()) <= 0.0:
        if risk_level in base:
            base[risk_level] = 0.7
            remaining = 0.3
            others = [k for k in base.keys() if k != risk_level]
            for k in others:
                base[k] = remaining / len(others)
        else:
            base = {"High": 1 / 3, "Medium": 1 / 3, "Low": 1 / 3}

    # Normalize to sum=1
    total = sum(max(0.0, v) for v in base.values())
    if total <= 0.0:
        return {"High": 1 / 3, "Medium": 1 / 3, "Low": 1 / 3}
    return {k: round(max(0.0, v) / total, 4) for k, v in base.items()}


def _normalize_top_factors(top_factors) -> List[dict]:
    if not isinstance(top_factors, list):
        return []

    out: list[dict] = []
    for item in top_factors[:10]:
        if not isinstance(item, dict):
            continue
        feature = str(item.get("feature") or "").strip() or "Unknown"
        direction = str(item.get("direction") or "").strip().lower()
        if direction not in {"high", "low"}:
            direction = "high"

        def _f(key, default=None):
            try:
                v = item.get(key)
                return float(v) if v is not None else default
            except Exception:
                return default

        out.append(
            {
                "feature": feature,
                "value": _f("value", None),
                "threshold": _f("threshold", None),
                "direction": direction,
                "impact": _f("impact", 0.0),
            }
        )

    return out[:6]


def _predict_risk_with_mistral(form_data: dict) -> dict:
    api_key = _get_hf_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="HF_API_KEY is not set; Mistral risk engine is unavailable.")

    model = os.environ.get("MISTRAL_MODEL") or os.environ.get("HF_MODEL") or "mistralai/Mistral-7B-Instruct-v0.2:featherless-ai"

    system = (
        "You are a health risk assessment engine. "
        "Given a user's health/lifestyle JSON, output ONLY valid JSON with keys: "
        "risk_level (High|Medium|Low), probabilities ({High,Medium,Low} in [0,1] sum=1), "
        "top_factors (list up to 6 items; each has feature, value, threshold, direction(high|low), impact in [0,1]), "
        "confidence in [0,1]. Do not include any extra text."
    )

    user = (
        "Input JSON:\n" + json.dumps(form_data, ensure_ascii=False) +
        "\n\nReturn ONLY the JSON object described above."
    )

    text, usage = _mistral_chat_completion(
        api_key=api_key,
        model=model,
        system=system,
        messages=[LlmChatMessage(role="user", content=user)],
        max_tokens=500,
        temperature=0.1,
    )

    d = _parse_llm_json(text)
    risk_level = str(d.get("risk_level") or "").strip()
    if risk_level not in {"High", "Medium", "Low"}:
        risk_level = "Medium"

    probabilities = _normalize_probabilities(d.get("probabilities"), risk_level=risk_level)
    confidence = float(d.get("confidence") or max(probabilities.values()))
    confidence = max(0.0, min(1.0, confidence))

    return {
        "risk_level": risk_level,
        "probabilities": probabilities,
        "top_factors": _normalize_top_factors(d.get("top_factors")),
        "confidence": round(float(confidence), 4),
        "usage": usage,
    }


def _recommendations_with_mistral(form_data: dict) -> dict:
    api_key = _get_hf_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="HF_API_KEY is not set; Mistral recommendations engine is unavailable.")

    model = os.environ.get("MISTRAL_MODEL") or os.environ.get("HF_MODEL") or "mistralai/Mistral-7B-Instruct-v0.2:featherless-ai"

    # First get a consistent risk profile (also from Mistral) to ground the recs.
    risk = _predict_risk_with_mistral(form_data)
    risk_level = risk.get("risk_level")
    probabilities = risk.get("probabilities") or {"High": 1 / 3, "Medium": 1 / 3, "Low": 1 / 3}
    top_factors = risk.get("top_factors") or []

    system = (
        "You are a wellness recommendation engine. "
        "Return ONLY valid JSON with key: recommendations. "
        "recommendations must be a list of exactly 6 items. Each item must have: "
        "category, icon (single emoji), priority (High|Medium|Low), title, description, "
        "action_steps (list of 3-6 short strings). Do not include any extra text."
    )

    user = (
        "User health JSON:\n" + json.dumps(form_data, ensure_ascii=False) +
        "\n\nComputed risk profile:\n" + json.dumps(
            {"risk_level": risk_level, "probabilities": probabilities, "top_factors": top_factors},
            ensure_ascii=False,
        ) +
        "\n\nReturn ONLY JSON: {\"recommendations\": [...]}"
    )

    def _ask_recs(extra_instruction: str = "") -> tuple[list, Optional[dict]]:
        prompt = user
        if extra_instruction:
            prompt += "\n\n" + extra_instruction
        text, usage = _mistral_chat_completion(
            api_key=api_key,
            model=model,
            system=system,
            messages=[LlmChatMessage(role="user", content=prompt)],
            max_tokens=900,
            temperature=0.3,
        )
        d = _parse_llm_json(text)
        recs = d.get("recommendations")
        return (recs if isinstance(recs, list) else []), usage

    recs, usage = _ask_recs()
    if not recs:
        recs, usage = _ask_recs(
            "Example format (values are placeholders, you must tailor them to the user's data):\n"
            "{\n"
            "  \"recommendations\": [\n"
            "    {\"category\":\"Sleep\",\"icon\":\"😴\",\"priority\":\"High\",\"title\":\"Improve sleep\",\"description\":\"...\",\"action_steps\":[\"...\",\"...\",\"...\"]}\n"
            "  ]\n"
            "}"
        )

    cleaned_recs: list[dict] = []
    for r in recs[:12]:
        if not isinstance(r, dict):
            continue
        priority = str(r.get("priority") or "Medium").strip().title()
        if priority not in {"High", "Medium", "Low"}:
            priority = "Medium"
        steps = r.get("action_steps")
        if not isinstance(steps, list):
            steps = []
        cleaned_recs.append(
            {
                "category": str(r.get("category") or "Wellness").strip() or "Wellness",
                "icon": (str(r.get("icon") or "💡").strip() or "💡")[:16],
                "priority": priority,
                "title": str(r.get("title") or "Recommendation").strip() or "Recommendation",
                "description": str(r.get("description") or "").strip(),
                "action_steps": [str(s).strip() for s in steps if str(s).strip()][:6],
            }
        )

    return {
        "risk_level": risk_level,
        "recommendations": cleaned_recs,
        "top_factors": top_factors,
        "probabilities": probabilities,
        "usage": usage,
    }


# ─── ROUTES ──────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Risk Analysis API v1.0"}


@app.post("/api/predict-risk", response_model=PredictResponse)
def api_predict_risk(payload: UserInput):
    try:
        d = payload.dict()
        try:
            r = _predict_risk_with_mistral(d)
            # strip usage for response_model
            r.pop("usage", None)
            return r
        except Exception:
            # Fallback to local ML only when enabled
            if _is_local_ml_enabled():
                predict_risk, _, _ = _load_ml_functions()
                return predict_risk(d)
            raise
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="Model artifacts not found. Run train_model.py first."
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/recommendations", response_model=RecommendationResponse)
def api_recommendations(payload: UserInput):
    try:
        d = payload.dict()
        try:
            r = _recommendations_with_mistral(d)
            r.pop("usage", None)
            return r
        except Exception:
            if _is_local_ml_enabled():
                _, get_recommendations, _ = _load_ml_functions()
                return get_recommendations(d)
            raise
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="Model artifacts not found. Run train_model.py first."
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/model-metrics")
def api_model_metrics():
    try:
        _, _, get_model_metrics = _load_ml_functions()
        return get_model_metrics()
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="Model metrics not found. Run train_model.py first."
        )
    except HTTPException as e:
        raise e


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


def _chat(payload: ChatRequest) -> ChatResponse:
    return _chat_with_mistral(payload)


def _extract_json_dict(text: str) -> Optional[dict]:
    """Best-effort extraction of a JSON-like dict from a string.

    Supports:
      - raw JSON
      - fenced ```json blocks
      - Python dict literals (via ast.literal_eval) as a fallback
    """

    if not isinstance(text, str) or not text.strip():
        return None

    raw = text.strip()

    # Strip fenced code blocks if present
    if "```" in raw:
        parts = raw.split("```")
        for i in range(1, len(parts), 2):
            candidate = parts[i]
            candidate = candidate.replace("json\n", "", 1).strip()
            if candidate.startswith("{") and candidate.endswith("}"):
                raw = candidate
                break

    # Try to isolate a {...} payload within surrounding text
    if not (raw.startswith("{") and raw.endswith("}")):
        start = raw.find("{")
        end = raw.rfind("}")
        if start != -1 and end != -1 and end > start:
            raw = raw[start : end + 1]

    # JSON first
    try:
        obj = json.loads(raw)
        if isinstance(obj, dict):
            return obj
    except Exception:
        pass

    # Python literal dict as fallback (common when users paste with single-quotes)
    try:
        obj = ast.literal_eval(raw)
        if isinstance(obj, dict):
            return obj
    except Exception:
        pass

    return None


def _chat_with_mistral(payload: ChatRequest) -> ChatResponse:
    api_key = _get_hf_api_key()
    model = (
        payload.model
        or os.environ.get("MISTRAL_MODEL")
        or os.environ.get("HF_MODEL")
        or "mistralai/Mistral-7B-Instruct-v0.2:featherless-ai"
    )

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="HF_API_KEY is not set; Mistral chat is unavailable.",
        )

    content, usage = _mistral_chat_completion(
        api_key=api_key,
        model=model,
        system=payload.system or "",
        messages=payload.messages,
        max_tokens=payload.max_tokens,
        temperature=payload.temperature,
    )
    return ChatResponse(model=model, content=content, usage=usage)


@app.post("/api/chat", response_model=ChatResponse)
def api_chat(payload: ChatRequest):
    """Canonical chat endpoint (Mistral via HF Router)."""
    return _chat(payload)


@app.post("/api/gemini/chat", response_model=ChatResponse)
def api_gemini_chat(payload: ChatRequest):
    """Deprecated alias; kept for frontend/backward compatibility."""
    return api_chat(payload)


# Backward-compatible alias (frontend used to call /api/claude/chat)
@app.post("/api/claude/chat", response_model=ChatResponse)
def api_claude_chat_alias(payload: ChatRequest):
    """Deprecated alias; kept for backward compatibility."""
    return api_chat(payload)
