from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("NEWID()"),
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    google_sub: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("GETUTCDATE()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("GETUTCDATE()"),
        onupdate=func.getutcdate(),
    )

    owned_classes = relationship("Class", back_populates="teacher", foreign_keys="Class.teacher_id")
    class_memberships = relationship("ClassMember", back_populates="student", foreign_keys="ClassMember.student_id")
    questions = relationship("QuestionBank", back_populates="teacher")
    owned_exam_batches = relationship("ExamBatch", back_populates="teacher", foreign_keys="ExamBatch.teacher_id")
    submissions = relationship("Submission", back_populates="student", foreign_keys="Submission.student_id")
    reviewed_grades = relationship("Grade", back_populates="reviewer", foreign_keys="Grade.reviewed_by")


class Class(Base):
    __tablename__ = "classes"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("NEWID()"),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    join_code: Mapped[str] = mapped_column(String(6), nullable=False, unique=True)
    teacher_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("GETUTCDATE()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("GETUTCDATE()"),
        onupdate=func.getutcdate(),
    )

    teacher = relationship("User", back_populates="owned_classes", foreign_keys=[teacher_id])
    members = relationship("ClassMember", back_populates="class_", cascade="all, delete-orphan")
    exam_batches = relationship("ExamBatch", back_populates="class_", cascade="all, delete-orphan")


class ClassMember(Base):
    __tablename__ = "class_members"
    __table_args__ = (UniqueConstraint("class_id", "student_id", name="UQ_class_members_class_student"),)

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("NEWID()"),
    )
    class_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("classes.id"), nullable=False, index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("GETUTCDATE()"),
    )
    left_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)

    class_ = relationship("Class", back_populates="members")
    student = relationship("User", back_populates="class_memberships", foreign_keys=[student_id])


class QuestionBank(Base):
    __tablename__ = "question_bank"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("NEWID()"),
    )
    teacher_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    expected_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    rubric_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    rubric_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    max_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("GETUTCDATE()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("GETUTCDATE()"),
        onupdate=func.getutcdate(),
    )

    teacher = relationship("User", back_populates="questions")
    exam_questions = relationship("ExamQuestion", back_populates="question")


class ExamBatch(Base):
    __tablename__ = "exam_batches"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("NEWID()"),
    )
    class_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("classes.id"), nullable=False, index=True)
    teacher_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    time_limit_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    qr_code_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    qr_token: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("GETUTCDATE()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("GETUTCDATE()"),
        onupdate=func.getutcdate(),
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)
    finalized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)

    class_ = relationship("Class", back_populates="exam_batches")
    teacher = relationship("User", back_populates="owned_exam_batches", foreign_keys=[teacher_id])
    exam_questions = relationship("ExamQuestion", back_populates="exam_batch", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="exam_batch", cascade="all, delete-orphan")


class ExamQuestion(Base):
    __tablename__ = "exam_questions"
    __table_args__ = (UniqueConstraint("exam_batch_id", "order_index", name="UQ_exam_questions_batch_order"),)

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("NEWID()"),
    )
    exam_batch_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("exam_batches.id"), nullable=False, index=True)
    question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("question_bank.id"), nullable=False, index=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    prompt_snapshot: Mapped[str] = mapped_column(Text, nullable=False)
    rubric_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    max_score_snapshot: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)

    exam_batch = relationship("ExamBatch", back_populates="exam_questions")
    question = relationship("QuestionBank", back_populates="exam_questions")
    submission_answers = relationship("SubmissionAnswer", back_populates="exam_question")
    grades = relationship("Grade", back_populates="exam_question")


class Submission(Base):
    __tablename__ = "submissions"
    __table_args__ = (UniqueConstraint("exam_batch_id", "student_id", name="UQ_submissions_exam_student"),)

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("NEWID()"),
    )
    exam_batch_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("exam_batches.id"), nullable=False, index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    attempt_no: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("GETUTCDATE()"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("GETUTCDATE()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("GETUTCDATE()"),
        onupdate=func.getutcdate(),
    )

    exam_batch = relationship("ExamBatch", back_populates="submissions")
    student = relationship("User", back_populates="submissions", foreign_keys=[student_id])
    pages = relationship("SubmissionPage", back_populates="submission", cascade="all, delete-orphan")
    answers = relationship("SubmissionAnswer", back_populates="submission", cascade="all, delete-orphan")
    grades = relationship("Grade", back_populates="submission", cascade="all, delete-orphan")


class SubmissionPage(Base):
    __tablename__ = "submission_pages"
    __table_args__ = (UniqueConstraint("submission_id", "page_number", name="UQ_submission_pages_submission_page"),)

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("NEWID()"),
    )
    submission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("submissions.id"), nullable=False, index=True)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    image_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    ocr_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    ocr_confidence: Mapped[float | None] = mapped_column(Numeric(5, 4), nullable=True)
    visualization_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("GETUTCDATE()"),
    )

    submission = relationship("Submission", back_populates="pages")


class SubmissionAnswer(Base):
    __tablename__ = "submission_answers"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("NEWID()"),
    )
    submission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("submissions.id"), nullable=False, index=True)
    exam_question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("exam_questions.id"), nullable=False, index=True)
    aggregated_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_confidence: Mapped[float | None] = mapped_column(Numeric(5, 4), nullable=True)
    needs_review: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("0"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("GETUTCDATE()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("GETUTCDATE()"),
        onupdate=func.getutcdate(),
    )

    submission = relationship("Submission", back_populates="answers")
    exam_question = relationship("ExamQuestion", back_populates="submission_answers")
    grades = relationship("Grade", back_populates="submission_answer")


class Grade(Base):
    __tablename__ = "grades"
    __table_args__ = (UniqueConstraint("submission_id", "exam_question_id", name="UQ_grades_submission_question"),)

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("NEWID()"),
    )
    submission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("submissions.id"), nullable=False, index=True)
    exam_question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("exam_questions.id"), nullable=False, index=True)
    submission_answer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("submission_answers.id"), nullable=False, index=True)
    ai_score: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    ai_reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_confidence: Mapped[float | None] = mapped_column(Numeric(5, 4), nullable=True)
    teacher_override_score: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    teacher_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_human_reviewed: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("0"))
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=False), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("GETUTCDATE()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        nullable=False,
        server_default=text("GETUTCDATE()"),
        onupdate=func.getutcdate(),
    )

    submission = relationship("Submission", back_populates="grades")
    exam_question = relationship("ExamQuestion", back_populates="grades")
    submission_answer = relationship("SubmissionAnswer", back_populates="grades")
    reviewer = relationship("User", back_populates="reviewed_grades", foreign_keys=[reviewed_by])
