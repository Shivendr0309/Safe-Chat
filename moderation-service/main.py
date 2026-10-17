import os
import secrets
from functools import lru_cache
from typing import Dict

from detoxify import Detoxify
from fastapi import Depends, FastAPI, Header, HTTPException, status
from pydantic import BaseModel, Field

app = FastAPI(title="SafeChat Moderation Service", version="1.0.0")

MODEL_NAME = os.getenv("DETOXIFY_MODEL", "original")
API_KEY = os.getenv("MODERATION_API_KEY", "")
TOXICITY_THRESHOLD = float(os.getenv("TOXICITY_THRESHOLD", "0.70"))
SEVERE_TOXICITY_THRESHOLD = float(os.getenv("SEVERE_TOXICITY_THRESHOLD", "0.50"))
THREAT_THRESHOLD = float(os.getenv("THREAT_THRESHOLD", "0.50"))
INSULT_THRESHOLD = float(os.getenv("INSULT_THRESHOLD", "0.75"))
IDENTITY_ATTACK_THRESHOLD = float(os.getenv("IDENTITY_ATTACK_THRESHOLD", "0.60"))
OBSCENE_THRESHOLD = float(os.getenv("OBSCENE_THRESHOLD", "0.80"))
SEXUAL_EXPLICIT_THRESHOLD = float(os.getenv("SEXUAL_EXPLICIT_THRESHOLD", "0.80"))


class ModerationRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class ModerationResponse(BaseModel):
    isFlagged: bool
    scores: Dict[str, float]
    model: str


@lru_cache(maxsize=1)
def get_model() -> Detoxify:
    return Detoxify(MODEL_NAME)


def require_api_key(authorization: str | None = Header(default=None)) -> None:
    if not API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Moderation service authentication is not configured",
        )
    scheme, _, supplied = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not supplied or not secrets.compare_digest(supplied, API_KEY):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid service credentials",
        )


@app.get("/")
def root() -> dict[str, str]:
    return {"name": "SafeChat Moderation Service", "status": "running"}


@app.get("/health")
def health() -> dict[str, str]:
    # Do not load the ML model just to answer a health check.
    return {
        "status": "ok" if API_KEY else "degraded",
        "authentication": "configured" if API_KEY else "not-configured",
        "model": MODEL_NAME,
    }


@app.post("/moderate", response_model=ModerationResponse, dependencies=[Depends(require_api_key)])
def moderate(payload: ModerationRequest) -> ModerationResponse:
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Text cannot be blank")

    try:
        raw_scores = get_model().predict(text)
        scores = {key: float(value) for key, value in raw_scores.items()}
    except Exception as exc:
        # Let the caller mark moderation as unavailable rather than treating a
        # model failure as a safe/clean classification.
        raise HTTPException(status_code=503, detail="Model inference failed") from exc

    thresholds = {
        "toxicity": TOXICITY_THRESHOLD,
        "severe_toxicity": SEVERE_TOXICITY_THRESHOLD,
        "threat": THREAT_THRESHOLD,
        "insult": INSULT_THRESHOLD,
        "identity_attack": IDENTITY_ATTACK_THRESHOLD,
        "obscene": OBSCENE_THRESHOLD,
        "sexual_explicit": SEXUAL_EXPLICIT_THRESHOLD,
    }
    is_flagged = any(scores.get(category, 0.0) >= threshold for category, threshold in thresholds.items())
    return ModerationResponse(isFlagged=is_flagged, scores=scores, model=MODEL_NAME)
