from fastapi import APIRouter, Request

from app import __version__

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    return {"status": "alive", "version": __version__}


@router.get("/ready")
def ready(request: Request) -> dict:
    settings = request.app.state.settings
    registry = request.app.state.model_registry
    return {
        "status": "ready" if registry.is_ready else "degraded",
        "models_loaded": registry.is_ready,
        "device": registry.get_models().device if registry.is_ready else None,
        "grading_enabled": settings.enable_grading,
        "internal_grading_only": settings.internal_grading_only,
        "load_error": registry.load_error,
        "version": __version__,
    }
