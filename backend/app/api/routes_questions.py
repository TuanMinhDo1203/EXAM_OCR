from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import QuestionBank, User
from app.schemas.db import QuestionBankCreate, QuestionBankRead, QuestionBankUpdate
from app.utils.tabular_import import load_tabular_rows

router = APIRouter(prefix="/api/questions", tags=["questions"])


def _question_payload(item: QuestionBank) -> dict:
    return QuestionBankRead.model_validate(item).model_dump(mode="json")


@router.get("")
def list_questions(
    subject: str | None = None,
    q: str | None = None,
    teacher_id: UUID | None = None,
    db: Session = Depends(get_db),
) -> dict:
    stmt = select(QuestionBank)
    if subject:
        stmt = stmt.where(QuestionBank.subject == subject)
    if q:
        stmt = stmt.where(QuestionBank.question_text.ilike(f"%{q}%"))
    if teacher_id:
        stmt = stmt.where(QuestionBank.teacher_id == teacher_id)

    questions = list(db.scalars(stmt.order_by(QuestionBank.created_at.desc())).all())
    return {
        "data": [_question_payload(item) for item in questions],
        "total": len(questions),
    }


@router.get("/{question_id}", response_model=QuestionBankRead)
def get_question(question_id: UUID, db: Session = Depends(get_db)) -> QuestionBank:
    item = db.get(QuestionBank, question_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Question not found")
    return item


@router.post("", response_model=QuestionBankRead, status_code=status.HTTP_201_CREATED)
def create_question(payload: QuestionBankCreate, db: Session = Depends(get_db)) -> QuestionBank:
    teacher = db.get(User, payload.teacher_id)
    if teacher is None or teacher.role != "teacher":
        raise HTTPException(status_code=404, detail="Teacher not found")

    item = QuestionBank(**payload.model_dump())
    db.add(item)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Question conflicts with existing data") from exc
    db.refresh(item)
    return item


@router.post("/import")
async def import_questions(
    teacher_id: UUID = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> dict:
    teacher = db.get(User, teacher_id)
    if teacher is None or teacher.role != "teacher":
        raise HTTPException(status_code=404, detail="Teacher not found")

    content = await file.read()
    try:
        rows = load_tabular_rows(file.filename or "questions.csv", content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    created_count = 0
    updated_count = 0
    skipped_rows = 0

    for row in rows:
        subject = row.get("subject", "").strip()
        question_text = row.get("question_text", "").strip()
        max_score_raw = row.get("max_score", "").strip()
        if not subject or not question_text or not max_score_raw:
            skipped_rows += 1
            continue

        try:
            max_score = float(max_score_raw)
        except ValueError:
            skipped_rows += 1
            continue

        item = db.scalar(
            select(QuestionBank).where(
                QuestionBank.teacher_id == teacher_id,
                QuestionBank.question_text == question_text,
            )
        )

        payload = {
            "teacher_id": teacher_id,
            "subject": subject,
            "question_text": question_text,
            "expected_answer": row.get("expected_answer") or None,
            "rubric_json": row.get("rubric_json") or None,
            "rubric_text": row.get("rubric_text") or None,
            "max_score": max_score,
        }

        if item is None:
            db.add(QuestionBank(**payload))
            created_count += 1
        else:
            for field, value in payload.items():
                setattr(item, field, value)
            item.updated_at = datetime.utcnow()
            updated_count += 1

    db.commit()
    return {
        "success": True,
        "rows_read": len(rows),
        "created": created_count,
        "updated": updated_count,
        "skipped_rows": skipped_rows,
        "required_columns": ["subject", "question_text", "max_score", "expected_answer(optional)", "rubric_text(optional)", "rubric_json(optional)"],
    }


@router.patch("/{question_id}", response_model=QuestionBankRead)
def update_question(question_id: UUID, payload: QuestionBankUpdate, db: Session = Depends(get_db)) -> QuestionBank:
    item = db.get(QuestionBank, question_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Question not found")

    data = payload.model_dump(exclude_unset=True)
    if "teacher_id" in data:
        teacher = db.get(User, data["teacher_id"])
        if teacher is None or teacher.role != "teacher":
            raise HTTPException(status_code=404, detail="Teacher not found")

    for field, value in data.items():
        setattr(item, field, value)
    item.updated_at = datetime.utcnow()

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Question update conflicts with existing data") from exc
    db.refresh(item)
    return item


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: UUID, db: Session = Depends(get_db)) -> Response:
    item = db.get(QuestionBank, question_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Question not found")

    db.delete(item)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
