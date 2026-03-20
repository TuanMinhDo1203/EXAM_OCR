import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api import grade_router, health_router, ocr_router
from app.core.config import get_settings
from app.core.logger import get_logger, setup_logging
from app.core.model_registry import ModelRegistry
from app.services.ocr_pipeline import OCRPipelineService


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    setup_logging(settings.log_level)
    logger = get_logger("backend.main")

    app.state.settings = settings
    app.state.logger = logger
    app.state.model_registry = ModelRegistry(settings)
    try:
        app.state.model_registry.load()
    except Exception:
        logger.exception("Model warmup failed at startup")
    app.state.ocr_service = OCRPipelineService(app.state.model_registry, settings)
    yield


app = FastAPI(title="Exam OCR Backend", lifespan=lifespan)
settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=settings.storage_dir), name="static")


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id", uuid.uuid4().hex)
    request.state.request_id = request_id
    started = time.perf_counter()

    try:
        response = await call_next(request)
    except Exception as exc:
        logger = request.app.state.logger
        logger.exception(
            "Unhandled request failure path=%s",
            request.url.path,
            extra={"request_id": request_id, "upload_name": "-"},
        )
        return JSONResponse(status_code=500, content={"detail": str(exc), "request_id": request_id})

    response.headers["X-Request-ID"] = request_id
    request.app.state.logger.info(
        "Request completed method=%s path=%s status=%s duration_ms=%.2f",
        request.method,
        request.url.path,
        response.status_code,
        (time.perf_counter() - started) * 1000,
        extra={"request_id": request_id, "upload_name": "-"},
    )
    return response


app.include_router(health_router)
app.include_router(ocr_router)
app.include_router(grade_router)
