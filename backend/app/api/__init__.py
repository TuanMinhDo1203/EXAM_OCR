from .routes_health import router as health_router
from .routes_ocr import router as ocr_router
from .routes_grade import router as grade_router

__all__ = ["health_router", "ocr_router", "grade_router"]
