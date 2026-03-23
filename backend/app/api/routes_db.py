from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_db
from app.models import Class, ExamBatch, Submission, User
from app.schemas.db import (
    ClassCreate,
    ClassRead,
    ExamBatchCreate,
    ExamBatchRead,
    SubmissionCreate,
    SubmissionRead,
    UserCreate,
    UserRead,
)

router = APIRouter(prefix="/api", tags=["database"])


@router.get("/db/health")
def db_health(db: Session = Depends(get_db)) -> dict:
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "azure-sql"}


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db)) -> User:
    item = User(
        email=payload.email,
        display_name=payload.display_name,
        avatar_url=payload.avatar_url,
        role=payload.role,
        google_sub=payload.google_sub,
    )
    db.add(item)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="User already exists") from exc
    db.refresh(item)
    return item


@router.get("/classes", response_model=list[ClassRead])
def list_classes(db: Session = Depends(get_db)) -> list[Class]:
    return list(db.scalars(select(Class).order_by(Class.id.desc())).all())


@router.post("/classes", response_model=ClassRead, status_code=status.HTTP_201_CREATED)
def create_class(payload: ClassCreate, db: Session = Depends(get_db)) -> Class:
    teacher = db.get(User, payload.teacher_id)
    if teacher is None:
        raise HTTPException(status_code=404, detail="Teacher not found")

    item = Class(
        name=payload.name,
        subject=payload.subject,
        join_code=payload.join_code,
        teacher_id=payload.teacher_id,
    )
    db.add(item)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Class already exists") from exc
    db.refresh(item)
    return item


@router.post("/exams", response_model=ExamBatchRead, status_code=status.HTTP_201_CREATED)
def create_exam(payload: ExamBatchCreate, db: Session = Depends(get_db)) -> ExamBatch:
    class_item = db.get(Class, payload.class_id)
    if class_item is None:
        raise HTTPException(status_code=404, detail="Class not found")
    teacher = db.get(User, payload.teacher_id)
    if teacher is None:
        raise HTTPException(status_code=404, detail="Teacher not found")

    item = ExamBatch(
        class_id=payload.class_id,
        teacher_id=payload.teacher_id,
        title=payload.title,
        time_limit_minutes=payload.time_limit_minutes,
        qr_code_url=payload.qr_code_url,
        qr_token=payload.qr_token,
        status=payload.status,
    )
    db.add(item)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Exam batch already exists") from exc
    db.refresh(item)
    return item


@router.post("/submissions", response_model=SubmissionRead, status_code=status.HTTP_201_CREATED)
def create_submission(payload: SubmissionCreate, db: Session = Depends(get_db)) -> Submission:
    exam_item = db.get(ExamBatch, payload.exam_batch_id)
    if exam_item is None:
        raise HTTPException(status_code=404, detail="Exam batch not found")

    student_item = db.get(User, payload.student_id)
    if student_item is None:
        raise HTTPException(status_code=404, detail="User not found")

    item = Submission(
        exam_batch_id=payload.exam_batch_id,
        student_id=payload.student_id,
        status=payload.status,
        attempt_no=payload.attempt_no,
    )
    db.add(item)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Submission already exists") from exc
    db.refresh(item)
    return item
