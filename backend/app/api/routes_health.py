from fastapi import APIRouter, Request
from redis import Redis

from app import __version__

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    return {"status": "alive", "version": __version__}


@router.get("/ready")
def ready(request: Request) -> dict:
    settings = request.app.state.settings
    registry = request.app.state.model_registry
    redis_connected = None
    if settings.ocr_job_backend == "celery":
        try:
            redis_client = Redis.from_url(settings.redis_url, socket_connect_timeout=1, socket_timeout=1)
            redis_connected = bool(redis_client.ping())
        except Exception:
            redis_connected = False
    return {
        "status": "ready" if registry.is_ready else "degraded",
        "models_loaded": registry.is_ready,
        "database_connected": getattr(request.app.state, "db_ok", False),
        "device": registry.get_models().device if registry.is_ready else None,
        "ocr_job_backend": settings.ocr_job_backend,
        "ocr_inference_mode": settings.ocr_inference_mode,
        "redis_connected": redis_connected,
        "grading_enabled": settings.enable_grading,
        "internal_grading_only": settings.internal_grading_only,
        "load_error": registry.load_error,
        "version": __version__,
    }
