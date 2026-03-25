from __future__ import annotations

import csv
import io
import uuid
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import Class, ClassMember, ExamBatch, ExamQuestion, Grade, QuestionBank, Submission, SubmissionAnswer, SubmissionPage
from app.schemas.app_v2 import CreateExamRequest, ExamDetailResponse, ExamQuestionSummary, ExamResponse, StudentSummary, SubmissionSummary

router = APIRouter(prefix="/api/exams", tags=["exams"])


def _to_submission_summary(submission: Submission) -> SubmissionSummary:
    total_score = sum(float(grade.teacher_override_score or grade.ai_score or 0.0) for grade in submission.grades)
    max_score = sum(float(grade.exam_question.max_score_snapshot or 0.0) for grade in submission.grades)
    if submission.status in {"uploaded", "ocr_processing", "grading"}:
        ocr_status = "processing"
    elif submission.status == "needs_review":
        ocr_status = "attention"
    elif submission.status in {"ocr_done", "graded"}:
        ocr_status = "verified"
    else:
        ocr_status = "pending"

    ai_feedback = "Pending OCR/AI evaluation."
    if submission.grades:
        ai_feedback = submission.grades[0].ai_reasoning or ai_feedback

    return SubmissionSummary(
        id=str(submission.id),
        exam_batch_id=str(submission.exam_batch_id),
        student=StudentSummary(
            id=str(submission.student.id),
            display_name=submission.student.display_name or submission.student.email,
            avatar_url=submission.student.avatar_url,
        ),
        scanned_pages=len(submission.pages),
        ocr_status=ocr_status,
        ai_feedback=ai_feedback,
        score=round(total_score, 2) if submission.grades else None,
        max_score=round(max_score, 2),
        submitted_at=submission.submitted_at,
    )


def _to_exam_response(exam: ExamBatch, total_expected: int, total_submissions: int, avg_confidence: float, avg_score: float) -> ExamResponse:
    return ExamResponse(
        id=str(exam.id),
        class_id=str(exam.class_id),
        title=exam.title,
        subject=exam.class_.subject,
        time_limit_minutes=exam.time_limit_minutes,
        qr_code_url=exam.qr_code_url or "",
        qr_token=exam.qr_token,
        status=exam.status,
        total_submissions=total_submissions,
        total_expected=total_expected,
        avg_confidence=avg_confidence,
        avg_score=avg_score,
        created_at=exam.created_at,
        closed_at=exam.closed_at,
    )


@router.get("")
def list_exams(
    status: str | None = None,
    class_id: UUID | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
) -> dict:
    page = max(page, 1)
    page_size = max(1, min(page_size, 100))

    filters = []
    if status:
        filters.append(ExamBatch.status == status)
    if class_id:
        filters.append(ExamBatch.class_id == class_id)

    stmt = select(ExamBatch).options(selectinload(ExamBatch.class_))
    if filters:
        stmt = stmt.where(*filters)

    total_stmt = select(func.count(ExamBatch.id))
    if filters:
        total_stmt = total_stmt.where(*filters)
    total = int(db.scalar(total_stmt) or 0)
    exams = list(
        db.scalars(
            stmt.order_by(ExamBatch.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
    )

    data: list[ExamResponse] = []
    for exam in exams:
        total_expected = int(
            db.scalar(
                select(func.count(ClassMember.id)).where(
                    ClassMember.class_id == exam.class_id,
                    ClassMember.status == "active",
                )
            )
            or 0
        )
        total_submissions = int(
            db.scalar(select(func.count(Submission.id)).where(Submission.exam_batch_id == exam.id))
            or 0
        )
        avg_confidence = float(
            db.scalar(
                select(func.avg(SubmissionPage.ocr_confidence)).join(Submission).where(Submission.exam_batch_id == exam.id)
            )
            or 0.0
        )
        avg_score = float(
            db.scalar(
                select(
                    func.avg(
                        func.coalesce(Grade.teacher_override_score, Grade.ai_score)
                    )
                )
                .join(Submission, Submission.id == Grade.submission_id)
                .where(Submission.exam_batch_id == exam.id)
            )
            or 0.0
        )
        data.append(_to_exam_response(exam, total_expected, total_submissions, avg_confidence, round(avg_score, 2)))
    return {"data": data, "total": total, "page": page, "page_size": page_size}


@router.post("", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
def create_exam(payload: CreateExamRequest, db: Session = Depends(get_db)) -> ExamResponse:
    class_item = db.get(Class, payload.class_id)
    if class_item is None:
        raise HTTPException(status_code=404, detail="Class not found")
    if not payload.question_ids:
        raise HTTPException(status_code=400, detail="At least one question is required")
    if payload.subject and payload.subject != class_item.subject:
        raise HTTPException(status_code=400, detail="Subject does not match the selected class")

    questions = list(db.scalars(select(QuestionBank).where(QuestionBank.id.in_(payload.question_ids))).all())
    if len(questions) != len(payload.question_ids):
        raise HTTPException(status_code=404, detail="One or more questions not found")
    questions_by_id = {question.id: question for question in questions}

    qr_token = uuid.uuid4().hex[:12].upper()
    qr_code_url = f"https://api.qrserver.com/v1/create-qr-code/?data={qr_token}"

    exam = ExamBatch(
        class_id=class_item.id,
        teacher_id=class_item.teacher_id,
        title=payload.title,
        time_limit_minutes=payload.time_limit_minutes,
        qr_code_url=qr_code_url,
        qr_token=qr_token,
        status="active",
    )
    db.add(exam)
    db.flush()

    for order_index, question_id in enumerate(payload.question_ids, start=1):
        question = questions_by_id[question_id]
        rubric_snapshot = question.rubric_text
        if payload.rubric_text:
            rubric_snapshot = f"{question.rubric_text or ''}\n\nBatch rubric:\n{payload.rubric_text}".strip()
        db.add(
            ExamQuestion(
                exam_batch_id=exam.id,
                question_id=question.id,
                order_index=order_index,
                prompt_snapshot=question.question_text,
                rubric_snapshot=rubric_snapshot,
                max_score_snapshot=question.max_score,
            )
        )

    db.commit()
    db.refresh(exam)

    total_expected = int(
        db.scalar(
            select(func.count(ClassMember.id)).where(
                ClassMember.class_id == exam.class_id,
                ClassMember.status == "active",
            )
        )
        or 0
    )
    return _to_exam_response(exam, total_expected, 0, 0.0, 0.0)


@router.get("/{exam_id}", response_model=ExamDetailResponse)
def get_exam_detail(exam_id: UUID, db: Session = Depends(get_db)) -> ExamDetailResponse:
    exam = db.scalar(
        select(ExamBatch)
        .options(
            selectinload(ExamBatch.class_),
            selectinload(ExamBatch.exam_questions).selectinload(ExamQuestion.question),
            selectinload(ExamBatch.submissions).selectinload(Submission.student),
            selectinload(ExamBatch.submissions).selectinload(Submission.pages),
            selectinload(ExamBatch.submissions).selectinload(Submission.grades).selectinload(Grade.exam_question),
        )
        .where(ExamBatch.id == exam_id)
    )
    if exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")

    total_expected = int(
        db.scalar(
            select(func.count(ClassMember.id)).where(
                ClassMember.class_id == exam.class_id,
                ClassMember.status == "active",
            )
        )
        or 0
    )

    submissions = [_to_submission_summary(item) for item in exam.submissions]
    total_submissions = len(submissions)
    avg_confidence = float(
        db.scalar(
            select(func.avg(SubmissionPage.ocr_confidence)).join(Submission).where(Submission.exam_batch_id == exam.id)
        )
        or 0.0
    )
    avg_score = round(
        sum(item.score or 0.0 for item in submissions) / total_submissions, 2
    ) if total_submissions else 0.0

    base = _to_exam_response(exam, total_expected, total_submissions, avg_confidence, avg_score)
    questions = [
        ExamQuestionSummary(
            id=str(exam_question.question.id),
            teacher_id=str(exam_question.question.teacher_id),
            subject=exam_question.question.subject,
            question_text=exam_question.prompt_snapshot,
            expected_answer=exam_question.question.expected_answer,
            rubric_text=exam_question.rubric_snapshot,
            max_score=float(exam_question.max_score_snapshot),
            created_at=exam_question.question.created_at,
        )
        for exam_question in sorted(exam.exam_questions, key=lambda item: item.order_index)
    ]
    return ExamDetailResponse(**base.model_dump(), submissions=submissions, questions=questions)


@router.delete("/{exam_id}/submissions/{submission_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_submission(exam_id: UUID, submission_id: UUID, db: Session = Depends(get_db)) -> Response:
    submission = db.scalar(
        select(Submission)
        .options(
            selectinload(Submission.pages),
            selectinload(Submission.answers).selectinload(SubmissionAnswer.grades),
            selectinload(Submission.grades),
        )
        .where(
            Submission.id == submission_id,
            Submission.exam_batch_id == exam_id,
        )
    )
    if submission is None:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Delete children in dependency-safe order for SQL Server.
    for grade in list(submission.grades):
        db.delete(grade)
    for answer in list(submission.answers):
        for grade in list(answer.grades):
            db.delete(grade)
        db.delete(answer)
    for page in list(submission.pages):
        db.delete(page)
    db.delete(submission)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{exam_id}/finalize", response_model=ExamResponse)
def finalize_exam(exam_id: UUID, db: Session = Depends(get_db)) -> ExamResponse:
    exam = db.scalar(
        select(ExamBatch)
        .options(selectinload(ExamBatch.class_))
        .where(ExamBatch.id == exam_id)
    )
    if exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")

    now = datetime.utcnow()
    if exam.status == "finalized":
        total_expected = int(
            db.scalar(
                select(func.count(ClassMember.id)).where(
                    ClassMember.class_id == exam.class_id,
                    ClassMember.status == "active",
                )
            )
            or 0
        )
        total_submissions = int(
            db.scalar(select(func.count(Submission.id)).where(Submission.exam_batch_id == exam.id))
            or 0
        )
        avg_confidence = float(
            db.scalar(
                select(func.avg(SubmissionPage.ocr_confidence)).join(Submission).where(Submission.exam_batch_id == exam.id)
            )
            or 0.0
        )
        avg_score = float(
            db.scalar(
                select(func.avg(func.coalesce(Grade.teacher_override_score, Grade.ai_score)))
                .join(Submission, Submission.id == Grade.submission_id)
                .where(Submission.exam_batch_id == exam.id)
            )
            or 0.0
        )
        return _to_exam_response(exam, total_expected, total_submissions, avg_confidence, round(avg_score, 2))

    exam.status = "finalized"
    if exam.closed_at is None:
        exam.closed_at = now
    exam.finalized_at = now
    db.commit()
    db.refresh(exam)

    total_expected = int(
        db.scalar(
            select(func.count(ClassMember.id)).where(
                ClassMember.class_id == exam.class_id,
                ClassMember.status == "active",
            )
        )
        or 0
    )
    total_submissions = int(
        db.scalar(select(func.count(Submission.id)).where(Submission.exam_batch_id == exam.id))
        or 0
    )
    avg_confidence = float(
        db.scalar(
            select(func.avg(SubmissionPage.ocr_confidence)).join(Submission).where(Submission.exam_batch_id == exam.id)
        )
        or 0.0
    )
    avg_score = float(
        db.scalar(
            select(func.avg(func.coalesce(Grade.teacher_override_score, Grade.ai_score)))
            .join(Submission, Submission.id == Grade.submission_id)
            .where(Submission.exam_batch_id == exam.id)
        )
        or 0.0
    )
    return _to_exam_response(exam, total_expected, total_submissions, avg_confidence, round(avg_score, 2))


@router.get("/{exam_id}/export")
def export_exam_csv(exam_id: UUID, db: Session = Depends(get_db)) -> Response:
    exam = db.scalar(
        select(ExamBatch)
        .options(
            selectinload(ExamBatch.class_),
            selectinload(ExamBatch.submissions).selectinload(Submission.student),
            selectinload(ExamBatch.submissions).selectinload(Submission.pages),
            selectinload(ExamBatch.submissions).selectinload(Submission.grades),
        )
        .where(ExamBatch.id == exam_id)
    )
    if exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "submission_id",
        "student_name",
        "student_email",
        "ocr_status",
        "score",
        "max_score",
        "submitted_at",
        "ocr_text",
    ])

    for submission in sorted(exam.submissions, key=lambda item: item.submitted_at):
        summary = _to_submission_summary(submission)
        page_text = "\n\n".join((page.ocr_text or "").strip() for page in submission.pages if page.ocr_text)
        writer.writerow([
            str(submission.id),
            submission.student.display_name or submission.student.email,
            submission.student.email,
            summary.ocr_status,
            summary.score if summary.score is not None else "",
            summary.max_score,
            submission.submitted_at.isoformat(),
            page_text,
        ])

    filename = f"exam_{exam.qr_token}_submissions.csv"
    return Response(
        content=output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
