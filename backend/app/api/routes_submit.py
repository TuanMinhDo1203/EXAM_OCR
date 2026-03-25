from __future__ import annotations

import threading
import time
from uuid import UUID

from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import ClassMember, ExamBatch, Submission, SubmissionPage, User
from app.schemas.app_v2 import SubmitExamInfoResponse, SubmitStudentValidationResponse, SubmitUploadResponse
from app.services.file_manager import FileValidationError, validate_upload, write_upload
from app.services.submission_processing import process_submission_job
from app.workers.submission_tasks import enqueue_submission_processing

router = APIRouter(prefix="/api/submit", tags=["submit"])


def _resolve_student(
    db: Session,
    exam: ExamBatch,
    student_id: UUID | None,
    student_email: str | None,
) -> User:
    membership = None
    student = None

    if student_id is not None:
        student = db.get(User, student_id)
        if student is None or student.role != "student":
            raise HTTPException(status_code=404, detail="Student not found")
        membership = db.scalar(
            select(ClassMember).where(
                ClassMember.class_id == exam.class_id,
                ClassMember.student_id == student.id,
                ClassMember.status == "active",
            )
        )
        if membership is None:
            raise HTTPException(status_code=403, detail="Student is not an active member of this class")
        return student

    if student_email:
        normalized_email = student_email.strip().lower()
        student = db.scalar(select(User).where(User.email == normalized_email))
        if student is None:
            raise HTTPException(status_code=404, detail="Student email is not registered in the system")
        if student.role != "student":
            raise HTTPException(status_code=400, detail="Email does not belong to a student account")

        membership = db.scalar(
            select(ClassMember).where(
                ClassMember.class_id == exam.class_id,
                ClassMember.student_id == student.id,
                ClassMember.status == "active",
            )
        )
        if membership is None:
            raise HTTPException(status_code=403, detail="Student email is not an active member of this class")
        return student

    membership = db.scalar(
        select(ClassMember)
        .where(
            ClassMember.class_id == exam.class_id,
            ClassMember.status == "active",
        )
        .order_by(ClassMember.joined_at.asc())
    )
    if membership is None:
        raise HTTPException(status_code=404, detail="No active student found for this class")
    student = db.get(User, membership.student_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

def _process_submission_thread(app, submission_id: UUID, page_id: UUID, inference_mode: str) -> None:
    process_submission_job(
        settings=app.state.settings,
        logger=app.state.logger,
        ocr_service=app.state.ocr_service,
        submission_id=submission_id,
        page_id=page_id,
        inference_mode=inference_mode,
    )


@router.get("/{qr_token}", response_model=SubmitExamInfoResponse)
def validate_qr_token(qr_token: str, db: Session = Depends(get_db)) -> SubmitExamInfoResponse:
    exam = db.scalar(
        select(ExamBatch)
        .options(selectinload(ExamBatch.class_))
        .where(ExamBatch.qr_token == qr_token)
    )
    if exam is None:
        raise HTTPException(status_code=404, detail="Exam token not found")
    teacher = db.get(User, exam.teacher_id) if exam.teacher_id else None

    return SubmitExamInfoResponse(
        exam_title=exam.title,
        subject=exam.class_.subject,
        time_limit_minutes=exam.time_limit_minutes,
        status=exam.status,
        class_name=exam.class_.name,
        teacher_name=teacher.display_name if teacher else None,
    )


@router.post("/{qr_token}/validate-student", response_model=SubmitStudentValidationResponse)
def validate_student_for_exam(
    qr_token: str,
    student_email: str = Body(..., embed=True),
    db: Session = Depends(get_db),
) -> SubmitStudentValidationResponse:
    exam = db.scalar(select(ExamBatch).where(ExamBatch.qr_token == qr_token))
    if exam is None:
        raise HTTPException(status_code=404, detail="Exam token not found")
    if exam.status != "active":
        raise HTTPException(status_code=400, detail="Exam is not accepting submissions")

    student = _resolve_student(db, exam, None, student_email)
    return SubmitStudentValidationResponse(
        valid=True,
        student_id=str(student.id),
        student_email=student.email,
        student_display_name=student.display_name,
    )


@router.post("/{qr_token}/upload", response_model=SubmitUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_submission(
    qr_token: str,
    request: Request,
    student_id: UUID | None = None,
    student_email: str | None = Form(default=None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> SubmitUploadResponse:
    exam = db.scalar(
        select(ExamBatch)
        .options(selectinload(ExamBatch.exam_questions))
        .where(ExamBatch.qr_token == qr_token)
    )
    if exam is None:
        raise HTTPException(status_code=404, detail="Exam token not found")
    if exam.status != "active":
        raise HTTPException(status_code=400, detail="Exam is not accepting submissions")

    student = _resolve_student(db, exam, student_id, student_email)

    content = await file.read()
    started = time.perf_counter()
    try:
        validate_upload(file.filename or "upload.png", content, request.app.state.settings)
    except FileValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    existing_submission = db.scalar(
        select(Submission).where(
            Submission.exam_batch_id == exam.id,
            Submission.student_id == student.id,
        )
    )
    if existing_submission is not None:
        raise HTTPException(status_code=409, detail="Submission already exists for this student and exam")

    try:
        selected_inference_mode = request.app.state.settings.ocr_inference_mode
        saved_upload = write_upload(file.filename or "upload.png", content, request.app.state.settings)
        image_url = saved_upload.url

        submission = Submission(
            exam_batch_id=exam.id,
            student_id=student.id,
            status="ocr_processing",
            attempt_no=1,
        )
        db.add(submission)
        db.flush()

        page = SubmissionPage(
            submission_id=submission.id,
            page_number=1,
            image_url=image_url,
        )
        db.add(page)
        db.flush()

        db.commit()
        if request.app.state.settings.ocr_job_backend == "celery":
            task = enqueue_submission_processing(str(submission.id), str(page.id), selected_inference_mode)
            request.app.state.logger.info(
                "Submission OCR task enqueued",
                extra={
                    "request_id": request.state.request_id,
                    "submission_id": str(submission.id),
                    "page_id": str(page.id),
                    "task_id": task.id,
                    "ocr_mode": selected_inference_mode,
                },
            )
        else:
            worker = threading.Thread(
                target=_process_submission_thread,
                args=(request.app, submission.id, page.id, selected_inference_mode),
                daemon=True,
            )
            worker.start()
            request.app.state.logger.info(
                "Background OCR thread spawned",
                extra={
                    "request_id": request.state.request_id,
                    "submission_id": str(submission.id),
                    "page_id": str(page.id),
                    "ocr_mode": selected_inference_mode,
                },
            )
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Submission processing failed: {exc}") from exc

    return SubmitUploadResponse(
        success=True,
        submission_id=str(submission.id),
        status="uploaded",
        pages_created=1,
        processing_time=round(time.perf_counter() - started, 4),
        recognized_text="",
        message="Submission received successfully. OCR and grading will continue in the background.",
    )
