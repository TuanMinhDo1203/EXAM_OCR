from __future__ import annotations

import uuid
from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status

from app.database import get_db
from app.models import Class, ClassMember, ExamBatch, Submission, User
from app.schemas.db import (
    ClassCreate,
    ClassMemberCreateByEmail,
    ClassMemberSummaryRead,
    ClassRead,
    ClassSummaryRead,
    ClassUpdate,
    ExamBatchCreate,
    ExamBatchRead,
    SubmissionCreate,
    SubmissionRead,
    UserCreate,
    UserRead,
)
from app.utils.tabular_import import load_tabular_rows

router = APIRouter(prefix="/api", tags=["database"])


def _demo_google_sub(email: str) -> str:
    return f"demo:{email}:{uuid.uuid4().hex[:8]}"


def _class_summary(item: Class, member_count: int) -> ClassSummaryRead:
    return ClassSummaryRead(
        id=item.id,
        name=item.name,
        subject=item.subject,
        join_code=item.join_code,
        teacher_id=item.teacher_id,
        created_at=item.created_at,
        updated_at=item.updated_at,
        member_count=member_count,
    )


def _class_member_summary(item: ClassMember) -> ClassMemberSummaryRead:
    return ClassMemberSummaryRead(
        id=item.id,
        class_id=item.class_id,
        student_id=item.student_id,
        email=item.student.email,
        display_name=item.student.display_name,
        status=item.status,
        joined_at=item.joined_at,
        left_at=item.left_at,
    )


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


@router.get("/users", response_model=list[UserRead])
def list_users(role: str | None = None, db: Session = Depends(get_db)) -> list[User]:
    stmt = select(User)
    if role:
        stmt = stmt.where(User.role == role)
    return list(db.scalars(stmt.order_by(User.created_at.asc())).all())


@router.get("/classes", response_model=list[ClassSummaryRead])
def list_classes(db: Session = Depends(get_db)) -> list[ClassSummaryRead]:
    classes = list(db.scalars(select(Class).order_by(Class.created_at.desc())).all())
    results: list[ClassSummaryRead] = []
    for item in classes:
        member_count = int(
            db.scalar(
                select(func.count(ClassMember.id)).where(
                    ClassMember.class_id == item.id,
                    ClassMember.status == "active",
                )
            )
            or 0
        )
        results.append(_class_summary(item, member_count))
    return results


@router.post("/classes", response_model=ClassRead, status_code=status.HTTP_201_CREATED)
def create_class(payload: ClassCreate, db: Session = Depends(get_db)) -> Class:
    teacher = db.get(User, payload.teacher_id)
    if teacher is None or teacher.role != "teacher":
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


@router.get("/classes/{class_id}", response_model=ClassSummaryRead)
def get_class(class_id: UUID, db: Session = Depends(get_db)) -> ClassSummaryRead:
    item = db.get(Class, class_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Class not found")
    member_count = int(
        db.scalar(
            select(func.count(ClassMember.id)).where(
                ClassMember.class_id == item.id,
                ClassMember.status == "active",
            )
        )
        or 0
    )
    return _class_summary(item, member_count)


@router.patch("/classes/{class_id}", response_model=ClassRead)
def update_class(class_id: UUID, payload: ClassUpdate, db: Session = Depends(get_db)) -> Class:
    item = db.get(Class, class_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Class not found")

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
        raise HTTPException(status_code=409, detail="Class update conflicts with existing data") from exc
    db.refresh(item)
    return item


@router.delete("/classes/{class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_class(class_id: UUID, db: Session = Depends(get_db)) -> Response:
    item = db.get(Class, class_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Class not found")
    db.delete(item)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/classes/{class_id}/members", response_model=list[ClassMemberSummaryRead])
def list_class_members(class_id: UUID, db: Session = Depends(get_db)) -> list[ClassMemberSummaryRead]:
    item = db.get(Class, class_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Class not found")

    members = list(
        db.scalars(
            select(ClassMember)
            .options(selectinload(ClassMember.student))
            .where(ClassMember.class_id == class_id)
            .order_by(ClassMember.joined_at.asc())
        ).all()
    )
    return [_class_member_summary(member) for member in members]


@router.post("/classes/{class_id}/members", response_model=ClassMemberSummaryRead, status_code=status.HTTP_201_CREATED)
def create_class_member(class_id: UUID, payload: ClassMemberCreateByEmail, db: Session = Depends(get_db)) -> ClassMemberSummaryRead:
    item = db.get(Class, class_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Class not found")

    normalized_email = payload.email.strip().lower()
    student = db.scalar(select(User).where(User.email == normalized_email))
    if student is None:
        student = User(
            email=normalized_email,
            display_name=payload.display_name,
            role="student",
            google_sub=_demo_google_sub(normalized_email),
        )
        db.add(student)
        db.flush()
    elif student.role != "student":
        raise HTTPException(status_code=400, detail="User email does not belong to a student account")
    elif payload.display_name and not student.display_name:
        student.display_name = payload.display_name

    membership = db.scalar(
        select(ClassMember)
        .options(selectinload(ClassMember.student))
        .where(
            ClassMember.class_id == class_id,
            ClassMember.student_id == student.id,
        )
    )
    if membership is not None:
        if membership.status == "active":
            raise HTTPException(status_code=409, detail="Student is already in this class")
        membership.status = "active"
        membership.left_at = None
        membership.joined_at = datetime.utcnow()
    else:
        membership = ClassMember(
            class_id=class_id,
            student_id=student.id,
            status="active",
        )
        db.add(membership)

    db.commit()
    membership = db.scalar(
        select(ClassMember)
        .options(selectinload(ClassMember.student))
        .where(ClassMember.id == membership.id)
    )
    return _class_member_summary(membership)


@router.post("/classes/{class_id}/members/import")
async def import_class_members(class_id: UUID, file: UploadFile = File(...), db: Session = Depends(get_db)) -> dict:
    item = db.get(Class, class_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Class not found")

    content = await file.read()
    try:
        rows = load_tabular_rows(file.filename or "students.csv", content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    created_students = 0
    added_memberships = 0
    reactivated_memberships = 0
    skipped_rows = 0

    for row in rows:
        email = row.get("email", "").strip().lower()
        display_name = row.get("display_name") or row.get("name") or None
        if not email:
            skipped_rows += 1
            continue

        student = db.scalar(select(User).where(User.email == email))
        if student is None:
            student = User(
                email=email,
                display_name=display_name,
                role="student",
                google_sub=_demo_google_sub(email),
            )
            db.add(student)
            db.flush()
            created_students += 1
        elif student.role != "student":
            skipped_rows += 1
            continue
        elif display_name and not student.display_name:
            student.display_name = display_name

        membership = db.scalar(
            select(ClassMember).where(
                ClassMember.class_id == class_id,
                ClassMember.student_id == student.id,
            )
        )
        if membership is None:
            db.add(
                ClassMember(
                    class_id=class_id,
                    student_id=student.id,
                    status="active",
                )
            )
            added_memberships += 1
        elif membership.status != "active":
            membership.status = "active"
            membership.left_at = None
            membership.joined_at = datetime.utcnow()
            reactivated_memberships += 1
        else:
            skipped_rows += 1

    db.commit()
    return {
        "success": True,
        "rows_read": len(rows),
        "created_students": created_students,
        "added_memberships": added_memberships,
        "reactivated_memberships": reactivated_memberships,
        "skipped_rows": skipped_rows,
        "required_columns": ["email", "display_name(optional)"],
    }


@router.delete("/classes/{class_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_class_member(class_id: UUID, member_id: UUID, db: Session = Depends(get_db)) -> Response:
    membership = db.scalar(
        select(ClassMember).where(
            ClassMember.id == member_id,
            ClassMember.class_id == class_id,
        )
    )
    if membership is None:
        raise HTTPException(status_code=404, detail="Class member not found")

    membership.status = "removed"
    membership.left_at = datetime.utcnow()
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/db/exams", response_model=ExamBatchRead, status_code=status.HTTP_201_CREATED)
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


@router.post("/db/submissions", response_model=SubmissionRead, status_code=status.HTTP_201_CREATED)
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
