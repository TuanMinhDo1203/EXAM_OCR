from __future__ import annotations

from dataclasses import dataclass

from app.core.config import get_settings
from app.core.logger import get_logger, setup_logging
from app.core.model_registry import ModelRegistry
from app.database import init_database
from app.services.ocr_pipeline import OCRPipelineService

_runtime = None


@dataclass
class WorkerRuntime:
    settings: object
    logger: object
    model_registry: ModelRegistry | None
    ocr_service: OCRPipelineService | None


def get_worker_runtime() -> WorkerRuntime:
    global _runtime
    if _runtime is not None:
        return _runtime

    settings = get_settings()
    setup_logging(settings.log_level)
    logger = get_logger("backend.worker")

    try:
        init_database(create_tables=settings.auto_create_db_schema)
    except Exception:
        logger.exception("Worker database init failed")

    model_registry = None
    ocr_service = None

    model_registry = ModelRegistry(settings)
    try:
        model_registry.load()
        ocr_service = OCRPipelineService(model_registry, settings)
    except Exception:
        logger.exception("Worker OCR model warmup failed")

    _runtime = WorkerRuntime(
        settings=settings,
        logger=logger,
        model_registry=model_registry,
        ocr_service=ocr_service,
    )
    return _runtime
