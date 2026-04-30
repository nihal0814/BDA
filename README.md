# VitalIQ (BDA)

FastAPI backend + React (Vite) frontend for:
- Health risk assessment
- Dashboard insights
- Personalized recommendations
- AI Wellness Coach chat

## Architecture
- Frontend: `frontend/` (Vite dev server)
- Backend: `backend/` (FastAPI / Uvicorn)
- Local ML code + artifacts: `ml/` (optional fallback)

## Runtime behavior (important)
- `/api/predict-risk` and `/api/recommendations` always try **Mistral first** (via Hugging Face Router).
- If (and only if) the Mistral call fails, the backend **can** fall back to the local ML model **when enabled** (`ENABLE_LOCAL_ML=1`).

## Setup
### 1) Backend
1. Create your env file:
   - Copy `backend/.env.example` → `backend/.env`
   - Set `HF_API_KEY` (Hugging Face access token)
2. Install deps:
   - From repo root: `pip install -r backend/requirements.txt`
3. Run:
   - `cd backend`
   - `uvicorn main:app --reload --port 8000`

Backend is served on `http://127.0.0.1:8000`.

### 2) Frontend
1. Install deps:
   - `cd frontend`
   - `npm install`
2. Run dev server:
   - `npm run dev`

Frontend is served on `http://localhost:5173`.

## API (canonical)
- `POST /api/predict-risk`
- `POST /api/recommendations`
- `POST /api/insights`
- `GET  /api/model-metrics` (local ML only; requires `ENABLE_LOCAL_ML=1`)
- `POST /api/chat` (Mistral chat)

Compatibility aliases (deprecated; kept to avoid breaking older frontend code):
- `POST /api/gemini/chat` → `/api/chat`
- `POST /api/claude/chat` → `/api/chat`

## Notes
- Never commit real tokens. `backend/.env` is gitignored.
- If you want local fallback, set `ENABLE_LOCAL_ML=1` and ensure `ml/artifacts/` exists.
