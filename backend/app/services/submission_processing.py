from __future__ import annotations

import uuid
from pathlib import Path
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import Settings
from app.database import SessionLocal
from app.models import ExamBatch, Grade, Submission, SubmissionAnswer, SubmissionPage
from app.services.file_manager import read_asset_bytes
from app.services.ocr_pipeline import OCRPipelineService
from app.utils.image_utils import load_image_from_bytes


def score_text_for_question(text: str, max_score: float) -> tuple[float, float, str, bool]:
    if not text.strip():
        return 0.0, 0.2, "No OCR text extracted from submission.", True
    confidence = min(0.95, max(0.55, 0.6 + min(len(text), 400) / 1000))
    score = round(max_score * 0.8, 2)
    needs_review = confidence < 0.75
    reasoning = "Provisional AI grade generated from OCR text. Review manually if needed."
    return score, confidence, reasoning, needs_review


def run_pipeline_ocr(
    ocr_service: OCRPipelineService,
    file_name: str,
    content: bytes,
    request_id: str,
    inference_mode: str,
) -> dict[str, object]:
    image = load_image_from_bytes(content)
    try:
        result = ocr_service.predict(
            image=image,
            original_filename=file_name,
            request_id=request_id,
            inference_mode=inference_mode,
        )
    finally:
        image.close()
    box_confidences = [record["confidence"] for record in result.get("boxes", []) if record.get("text")]
    result["ocr_confidence"] = round(sum(box_confidences) / len(box_confidences), 4) if box_confidences else 0.0
    return result


def _clear_existing_submission_results(db: Session, submission_id: UUID) -> None:
    for grade in db.scalars(select(Grade).where(Grade.submission_id == submission_id)).all():
        db.delete(grade)
    for answer in db.scalars(select(SubmissionAnswer).where(SubmissionAnswer.submission_id == submission_id)).all():
        db.delete(answer)
    db.flush()


def process_submission_job(
    settings: Settings,
    logger,
    ocr_service: OCRPipelineService | None,
    submission_id: UUID | str,
    page_id: UUID | str,
    inference_mode: str | None = None,
) -> None:
    db = SessionLocal()
    submission_uuid = UUID(str(submission_id))
    page_uuid = UUID(str(page_id))
    request_id = uuid.uuid4().hex

    try:
        selected_mode = inference_mode or settings.ocr_inference_mode
        logger.info(
            "Submission OCR job started",
            extra={
                "request_id": request_id,
                "submission_id": str(submission_uuid),
                "page_id": str(page_uuid),
                "upload_name": "-",
                "ocr_mode": selected_mode,
            },
        )
        submission = db.scalar(
            select(Submission)
            .options(selectinload(Submission.exam_batch).selectinload(ExamBatch.exam_questions))
            .where(Submission.id == submission_uuid)
        )
        page = db.get(SubmissionPage, page_uuid)
        if submission is None or page is None:
            logger.warning(
                "Submission OCR job skipped because submission/page was not found",
                extra={"request_id": request_id, "submission_id": str(submission_uuid), "page_id": str(page_uuid), "upload_name": "-"},
            )
            return

        submission.status = "ocr_processing"
        db.commit()

        file_name = Path(page.image_url).name or f"{page.id}.png"
        content = read_asset_bytes(page.image_url, settings)

        if ocr_service is None:
            raise RuntimeError("OCR pipeline service is not available in this worker")
        ocr_result = run_pipeline_ocr(ocr_service, file_name, content, request_id, selected_mode)

        _clear_existing_submission_results(db, submission.id)

        page.ocr_text = ocr_result["recognized_text"]
        page.ocr_confidence = ocr_result.get("ocr_confidence")
        page.visualization_url = ocr_result.get("visualization_path")

        needs_review_any = False
        for exam_question in sorted(submission.exam_batch.exam_questions, key=lambda item: item.order_index):
            ai_score, ai_confidence, reasoning, needs_review = score_text_for_question(
                page.ocr_text or "",
                float(exam_question.max_score_snapshot),
            )
            needs_review_any = needs_review_any or needs_review
            answer = SubmissionAnswer(
                submission_id=submission.id,
                exam_question_id=exam_question.id,
                aggregated_text=page.ocr_text,
                ai_confidence=ai_confidence,
                needs_review=needs_review,
            )
            db.add(answer)
            db.flush()
            db.add(
                Grade(
                    submission_id=submission.id,
                    exam_question_id=exam_question.id,
                    submission_answer_id=answer.id,
                    ai_score=ai_score,
                    ai_reasoning=reasoning,
                    ai_confidence=ai_confidence,
                )
            )

        submission.status = "needs_review" if needs_review_any else "graded"
        db.commit()
        logger.info(
            "Submission OCR job finished",
            extra={
                "request_id": request_id,
                "submission_id": str(submission_uuid),
                "page_id": str(page_uuid),
                "final_status": submission.status,
                "upload_name": file_name,
                "ocr_mode": selected_mode,
            },
        )
    except Exception:
        db.rollback()
        logger.exception(
            "Submission OCR job failed",
            extra={
                "request_id": request_id,
                "submission_id": str(submission_uuid),
                "page_id": str(page_uuid),
                "upload_name": "-",
                "ocr_mode": inference_mode or settings.ocr_inference_mode,
            },
        )
        submission = db.get(Submission, submission_uuid)
        if submission is not None:
            submission.status = "needs_review"
            db.commit()
    finally:
        db.close()
