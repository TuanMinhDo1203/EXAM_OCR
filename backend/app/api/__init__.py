from .routes_dashboard import router as dashboard_router
from .routes_health import router as health_router
from .routes_ocr import router as ocr_router
from .routes_grade import router as grade_router
from .routes_db import router as db_router
from .routes_exams import router as exams_router
from .routes_questions import router as questions_router
from .routes_settings import router as settings_router
from .routes_submit import router as submit_router

__all__ = [
    "dashboard_router",
    "health_router",
    "ocr_router",
    "grade_router",
    "db_router",
    "exams_router",
    "questions_router",
    "settings_router",
    "submit_router",
]
