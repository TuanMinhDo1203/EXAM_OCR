from __future__ import annotations

from celery import Celery

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery("exam_ocr")
celery_app.conf.update(
    broker_url=settings.resolved_celery_broker_url,
    result_backend=settings.resolved_celery_result_backend,
    include=["app.workers.submission_tasks"],
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Ho_Chi_Minh",
    enable_utc=False,
    task_track_started=True,
    worker_prefetch_multiplier=1,
)
