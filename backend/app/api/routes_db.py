from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_db
from app.models import Class, Exam, Student, Submission
from app.schemas.db import (
    ClassCreate,
    ClassRead,
    ExamCreate,
    ExamRead,
    StudentCreate,
    StudentRead,
    SubmissionCreate,
    SubmissionRead,
)

router = APIRouter(prefix="/api", tags=["database"])


@router.get("/db/health")
def db_health(db: Session = Depends(get_db)) -> dict:
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "azure-sql"}


@router.post("/classes", response_model=ClassRead, status_code=status.HTTP_201_CREATED)
def create_class(payload: ClassCreate, db: Session = Depends(get_db)) -> Class:
    item = Class(class_name=payload.class_name)
    db.add(item)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Class already exists") from exc
    db.refresh(item)
    return item


@router.get("/classes", response_model=list[ClassRead])
def list_classes(db: Session = Depends(get_db)) -> list[Class]:
    return list(db.scalars(select(Class).order_by(Class.id.desc())).all())


@router.post("/students", response_model=StudentRead, status_code=status.HTTP_201_CREATED)
def create_student(payload: StudentCreate, db: Session = Depends(get_db)) -> Student:
    class_item = db.get(Class, payload.class_id)
    if class_item is None:
        raise HTTPException(status_code=404, detail="Class not found")

    item = Student(
        class_id=payload.class_id,
        student_code=payload.student_code,
        full_name=payload.full_name,
    )
    db.add(item)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Student code already exists") from exc
    db.refresh(item)
    return item


@router.post("/exams", response_model=ExamRead, status_code=status.HTTP_201_CREATED)
def create_exam(payload: ExamCreate, db: Session = Depends(get_db)) -> Exam:
    class_item = db.get(Class, payload.class_id)
    if class_item is None:
        raise HTTPException(status_code=404, detail="Class not found")

    item = Exam(
        class_id=payload.class_id,
        title=payload.title,
        description=payload.description,
        exam_date=payload.exam_date,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.post("/submissions", response_model=SubmissionRead, status_code=status.HTTP_201_CREATED)
def create_submission(payload: SubmissionCreate, db: Session = Depends(get_db)) -> Submission:
    exam_item = db.get(Exam, payload.exam_id)
    if exam_item is None:
        raise HTTPException(status_code=404, detail="Exam not found")

    student_item = db.get(Student, payload.student_id)
    if student_item is None:
        raise HTTPException(status_code=404, detail="Student not found")

    item = Submission(
        exam_id=payload.exam_id,
        student_id=payload.student_id,
        status=payload.status,
        score=payload.score,
        ocr_text=payload.ocr_text,
        original_file_path=payload.original_file_path,
        processed_file_path=payload.processed_file_path,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
