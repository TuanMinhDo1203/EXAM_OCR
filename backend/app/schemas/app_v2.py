from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CreateExamRequest(BaseModel):
    class_id: UUID
    title: str
    subject: str | None = None
    time_limit_minutes: int
    question_ids: list[UUID]
    rubric_text: str | None = None


class ExamQuestionSummary(BaseModel):
    id: str
    teacher_id: str | None = None
    subject: str
    question_text: str
    expected_answer: str | None = None
    rubric_text: str | None = None
    max_score: float
    created_at: datetime | None = None


class StudentSummary(BaseModel):
    id: str
    display_name: str
    avatar_url: str | None = None


class SubmissionSummary(BaseModel):
    id: str
    exam_batch_id: str
    student: StudentSummary
    scanned_pages: int
    ocr_status: str
    ai_feedback: str
    score: float | None
    max_score: float
    submitted_at: datetime


class ExamResponse(BaseModel):
    id: str
    class_id: str
    title: str
    subject: str
    time_limit_minutes: int
    qr_code_url: str
    qr_token: str
    status: str
    total_submissions: int
    total_expected: int
    avg_confidence: float
    avg_score: float
    created_at: datetime
    closed_at: datetime | None


class ExamDetailResponse(ExamResponse):
    submissions: list[SubmissionSummary] = Field(default_factory=list)
    questions: list[ExamQuestionSummary] = Field(default_factory=list)


class SubmitExamInfoResponse(BaseModel):
    exam_title: str
    subject: str
    time_limit_minutes: int
    status: str
    class_name: str
    teacher_name: str | None = None


class SubmitStudentValidationResponse(BaseModel):
    valid: bool
    student_id: str
    student_email: str
    student_display_name: str | None = None


class SubmitUploadResponse(BaseModel):
    success: bool
    submission_id: str
    status: str
    pages_created: int
    processing_time: float
    recognized_text: str
    message: str | None = None


class GradeItemResponse(BaseModel):
    id: str
    submission_id: str
    question_id: str
    question_text: str
    max_score: float
    ai_score: float
    ai_reasoning: str
    ai_confidence: float
    teacher_override_score: float | None
    teacher_comment: str | None
    is_human_reviewed: bool
    created_at: datetime


class SubmissionPageResponse(BaseModel):
    id: str
    page_number: int
    image_url: str
    ocr_text: str
    ocr_confidence: float
    visualization_url: str | None = None


class SubmissionGradeDetailResponse(BaseModel):
    submission: SubmissionSummary
    pages: list[SubmissionPageResponse]
    grades: list[GradeItemResponse]
    total_score: float
    max_possible_score: float


class GradeOverrideRequest(BaseModel):
    teacher_override_score: Decimal
    teacher_comment: str | None = None


class OCRTextUpdateRequest(BaseModel):
    ocr_text: str


class OCRSettingsResponse(BaseModel):
    ocr_inference_mode: Literal["local", "remote"]
    yolo_conf: float
    yolo_iou: float
    yolo_min_conf: float
    trocr_num_beams: int
    trocr_max_tokens: int
    save_visualizations: bool


class OCRSettingsUpdateRequest(BaseModel):
    ocr_inference_mode: Literal["local", "remote"] | None = None
    yolo_conf: float | None = None
    yolo_iou: float | None = None
    yolo_min_conf: float | None = None
    trocr_num_beams: int | None = None
    trocr_max_tokens: int | None = None
    save_visualizations: bool | None = None
