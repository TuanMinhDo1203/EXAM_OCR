from __future__ import annotations

from app.celery_app import celery_app
from app.services.submission_processing import process_submission_job
from app.workers.runtime import get_worker_runtime


@celery_app.task(name="submission.process_ocr")
def process_submission_ocr_task(submission_id: str, page_id: str, inference_mode: str | None = None) -> None:
    runtime = get_worker_runtime()
    process_submission_job(
        settings=runtime.settings,
        logger=runtime.logger,
        ocr_service=runtime.ocr_service,
        submission_id=submission_id,
        page_id=page_id,
        inference_mode=inference_mode,
    )


def enqueue_submission_processing(submission_id: str, page_id: str, inference_mode: str | None = None):
    return process_submission_ocr_task.delay(submission_id, page_id, inference_mode)
