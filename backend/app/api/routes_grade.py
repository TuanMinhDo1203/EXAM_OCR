from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import ExamQuestion, Grade, Submission, SubmissionPage
from app.schemas.app_v2 import (
    GradeItemResponse,
    GradeOverrideRequest,
    OCRTextUpdateRequest,
    StudentSummary,
    SubmissionGradeDetailResponse,
    SubmissionPageResponse,
    SubmissionSummary,
)

router = APIRouter(prefix="/api/grades", tags=["grades"])


def _submission_summary(submission: Submission) -> SubmissionSummary:
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

    ai_feedback = submission.grades[0].ai_reasoning if submission.grades else "Pending AI evaluation."
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
        ai_feedback=ai_feedback or "",
        score=round(total_score, 2) if submission.grades else None,
        max_score=round(max_score, 2),
        submitted_at=submission.submitted_at,
    )


@router.get("/submission/{submission_id}", response_model=SubmissionGradeDetailResponse)
def get_submission_grade_detail(submission_id: str, db: Session = Depends(get_db)) -> SubmissionGradeDetailResponse:
    submission = db.scalar(
        select(Submission)
        .options(
            selectinload(Submission.student),
            selectinload(Submission.pages),
            selectinload(Submission.grades).selectinload(Grade.exam_question).selectinload(ExamQuestion.question),
        )
        .where(Submission.id == submission_id)
    )
    if submission is None:
        raise HTTPException(status_code=404, detail="Submission not found")

    pages = [
        SubmissionPageResponse(
            id=str(item.id),
            page_number=item.page_number,
            image_url=item.image_url,
            ocr_text=item.ocr_text or "",
            ocr_confidence=float(item.ocr_confidence or 0.0),
            visualization_url=item.visualization_url,
        )
        for item in sorted(submission.pages, key=lambda page: page.page_number)
    ]
    grades = [
        GradeItemResponse(
            id=str(item.id),
            submission_id=str(item.submission_id),
            question_id=str(item.exam_question.question_id),
            question_text=item.exam_question.prompt_snapshot,
            max_score=float(item.exam_question.max_score_snapshot or 0.0),
            ai_score=float(item.ai_score or 0.0),
            ai_reasoning=item.ai_reasoning or "",
            ai_confidence=float(item.ai_confidence or 0.0),
            teacher_override_score=float(item.teacher_override_score) if item.teacher_override_score is not None else None,
            teacher_comment=item.teacher_comment,
            is_human_reviewed=item.is_human_reviewed,
            created_at=item.created_at,
        )
        for item in submission.grades
    ]
    total_score = round(sum((item.teacher_override_score or item.ai_score) for item in grades), 2) if grades else 0.0
    max_possible_score = round(sum(float(item.exam_question.max_score_snapshot or 0.0) for item in submission.grades), 2)
    return SubmissionGradeDetailResponse(
        submission=_submission_summary(submission),
        pages=pages,
        grades=grades,
        total_score=total_score,
        max_possible_score=max_possible_score,
    )


@router.patch("/{grade_id}/override", response_model=GradeItemResponse)
def override_grade(grade_id: str, payload: GradeOverrideRequest, db: Session = Depends(get_db)) -> GradeItemResponse:
    grade = db.scalar(
        select(Grade)
        .options(selectinload(Grade.exam_question))
        .where(Grade.id == grade_id)
    )
    if grade is None:
        raise HTTPException(status_code=404, detail="Grade not found")

    grade.teacher_override_score = payload.teacher_override_score
    grade.teacher_comment = payload.teacher_comment
    grade.is_human_reviewed = True
    grade.reviewed_at = datetime.utcnow()
    db.commit()
    db.refresh(grade)
    return GradeItemResponse(
        id=str(grade.id),
        submission_id=str(grade.submission_id),
        question_id=str(grade.exam_question.question_id),
        question_text=grade.exam_question.prompt_snapshot,
        max_score=float(grade.exam_question.max_score_snapshot or 0.0),
        ai_score=float(grade.ai_score or 0.0),
        ai_reasoning=grade.ai_reasoning or "",
        ai_confidence=float(grade.ai_confidence or 0.0),
        teacher_comment=grade.teacher_comment,
        is_human_reviewed=grade.is_human_reviewed,
        created_at=grade.created_at,
    )


@router.post("/{grade_id}/re-evaluate-ai", response_model=GradeItemResponse)
def reevaluate_ai(grade_id: str, db: Session = Depends(get_db)) -> GradeItemResponse:
    grade = db.scalar(
        select(Grade)
        .options(
            selectinload(Grade.exam_question).selectinload(ExamQuestion.question),
            selectinload(Grade.submission_answer)
        )
        .where(Grade.id == grade_id)
    )
    if grade is None:
        raise HTTPException(status_code=404, detail="Grade not found")

    system_prompt = grade.exam_question.rubric_snapshot or "You are an expert programming evaluator."
    problem_description = grade.exam_question.prompt_snapshot or ""
    ocr_text = grade.submission_answer.aggregated_text or ""

    if not ocr_text:
        raise HTTPException(status_code=400, detail="No OCR text available to evaluate.")

    from app.services.llm_grading import evaluate_ocr_with_ai
    
    llm_result = evaluate_ocr_with_ai(system_prompt, problem_description, ocr_text)
    if llm_result:
        grade.ai_score = llm_result.overall_score
        grade.ai_reasoning = llm_result.model_dump_json()
        db.commit()
        db.refresh(grade)
    else:
        raise HTTPException(status_code=500, detail="AI Evaluation failed. Please check OpenAI configuration.")

    return GradeItemResponse(
        id=str(grade.id),
        submission_id=str(grade.submission_id),
        question_id=str(grade.exam_question.question_id),
        question_text=grade.exam_question.prompt_snapshot,
        max_score=float(grade.exam_question.max_score_snapshot or 0.0),
        ai_score=float(grade.ai_score or 0.0),
        ai_reasoning=grade.ai_reasoning or "",
        ai_confidence=float(grade.ai_confidence or 0.0),
        teacher_override_score=float(grade.teacher_override_score) if grade.teacher_override_score is not None else None,
        teacher_comment=grade.teacher_comment,
        is_human_reviewed=grade.is_human_reviewed,
        created_at=grade.created_at,
    )


@router.patch("/submission-pages/{page_id}/ocr-text", response_model=SubmissionPageResponse)
def update_submission_page_ocr_text(page_id: str, payload: OCRTextUpdateRequest, db: Session = Depends(get_db)) -> SubmissionPageResponse:
    page = db.scalar(
        select(SubmissionPage)
        .options(selectinload(SubmissionPage.submission).selectinload(Submission.answers))
        .where(SubmissionPage.id == page_id)
    )
    if page is None:
        raise HTTPException(status_code=404, detail="Submission page not found")

    page.ocr_text = payload.ocr_text
    for answer in page.submission.answers:
        answer.aggregated_text = payload.ocr_text

    db.commit()
    db.refresh(page)
    return SubmissionPageResponse(
        id=str(page.id),
        page_number=page.page_number,
        image_url=page.image_url,
        ocr_text=page.ocr_text or "",
        ocr_confidence=float(page.ocr_confidence or 0.0),
        visualization_url=page.visualization_url,
    )
