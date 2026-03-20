from fastapi import HTTPException, status

from app.core.config import Settings


def enforce_grading_access(settings: Settings, internal_token: str | None) -> None:
    if not settings.enable_grading:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Grading is disabled. This route is internal/demo-only.",
        )

    if settings.internal_grading_only and settings.grading_api_key:
        if internal_token != settings.grading_api_key:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Missing or invalid internal grading token",
            )
