from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    email: str
    display_name: str | None = None
    avatar_url: str | None = None
    role: str
    google_sub: str


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    display_name: str | None
    avatar_url: str | None
    role: str
    google_sub: str
    created_at: datetime
    updated_at: datetime


class ClassCreate(BaseModel):
    name: str
    subject: str
    join_code: str
    teacher_id: UUID


class ClassRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    subject: str
    join_code: str
    teacher_id: UUID
    created_at: datetime
    updated_at: datetime


class ClassMemberCreate(BaseModel):
    class_id: UUID
    student_id: UUID
    status: str = "active"


class ClassMemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    class_id: UUID
    student_id: UUID
    status: str
    joined_at: datetime
    left_at: datetime | None


class QuestionBankCreate(BaseModel):
    teacher_id: UUID
    subject: str
    question_text: str
    expected_answer: str | None = None
    rubric_json: str | None = None
    rubric_text: str | None = None
    max_score: Decimal


class QuestionBankRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    teacher_id: UUID
    subject: str
    question_text: str
    expected_answer: str | None
    rubric_json: str | None
    rubric_text: str | None
    max_score: Decimal
    created_at: datetime
    updated_at: datetime


class ExamBatchCreate(BaseModel):
    class_id: UUID
    teacher_id: UUID
    title: str
    time_limit_minutes: int
    qr_code_url: str | None = None
    qr_token: str
    status: str = "draft"


class ExamBatchRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    class_id: UUID
    teacher_id: UUID
    title: str
    time_limit_minutes: int
    qr_code_url: str | None
    qr_token: str
    status: str
    created_at: datetime
    updated_at: datetime
    closed_at: datetime | None
    finalized_at: datetime | None


class ExamQuestionCreate(BaseModel):
    exam_batch_id: UUID
    question_id: UUID
    order_index: int
    prompt_snapshot: str
    rubric_snapshot: str | None = None
    max_score_snapshot: Decimal


class ExamQuestionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    exam_batch_id: UUID
    question_id: UUID
    order_index: int
    prompt_snapshot: str
    rubric_snapshot: str | None
    max_score_snapshot: Decimal


class SubmissionCreate(BaseModel):
    exam_batch_id: UUID
    student_id: UUID
    status: str
    attempt_no: int = 1


class SubmissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    exam_batch_id: UUID
    student_id: UUID
    status: str
    attempt_no: int
    submitted_at: datetime
    created_at: datetime
    updated_at: datetime


class SubmissionPageCreate(BaseModel):
    submission_id: UUID
    page_number: int
    image_url: str
    ocr_text: str | None = None
    ocr_confidence: Decimal | None = None
    visualization_url: str | None = None


class SubmissionPageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    submission_id: UUID
    page_number: int
    image_url: str
    ocr_text: str | None
    ocr_confidence: Decimal | None
    visualization_url: str | None
    created_at: datetime


class SubmissionAnswerCreate(BaseModel):
    submission_id: UUID
    exam_question_id: UUID
    aggregated_text: str | None = None
    ai_confidence: Decimal | None = None
    needs_review: bool = False


class SubmissionAnswerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    submission_id: UUID
    exam_question_id: UUID
    aggregated_text: str | None
    ai_confidence: Decimal | None
    needs_review: bool
    created_at: datetime
    updated_at: datetime


class GradeCreate(BaseModel):
    submission_id: UUID
    exam_question_id: UUID
    submission_answer_id: UUID
    ai_score: Decimal | None = None
    ai_reasoning: str | None = None
    ai_confidence: Decimal | None = None
    teacher_override_score: Decimal | None = None
    teacher_comment: str | None = None
    is_human_reviewed: bool = False
    reviewed_by: UUID | None = None
    reviewed_at: datetime | None = None


class GradeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    submission_id: UUID
    exam_question_id: UUID
    submission_answer_id: UUID
    ai_score: Decimal | None
    ai_reasoning: str | None
    ai_confidence: Decimal | None
    teacher_override_score: Decimal | None
    teacher_comment: str | None
    is_human_reviewed: bool
    reviewed_by: UUID | None
    reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime
