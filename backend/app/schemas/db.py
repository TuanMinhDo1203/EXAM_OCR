from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class ClassCreate(BaseModel):
    class_name: str


class ClassRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    class_name: str
    created_at: datetime


class StudentCreate(BaseModel):
    class_id: int
    student_code: str
    full_name: str


class StudentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    class_id: int
    student_code: str
    full_name: str
    created_at: datetime


class ExamCreate(BaseModel):
    class_id: int
    title: str
    description: str | None = None
    exam_date: date | None = None


class ExamRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    class_id: int
    title: str
    description: str | None
    exam_date: date | None
    created_at: datetime


class SubmissionCreate(BaseModel):
    exam_id: int
    student_id: int
    status: str
    score: float | None = None
    ocr_text: str | None = None
    original_file_path: str | None = None
    processed_file_path: str | None = None


class SubmissionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    exam_id: int
    student_id: int
    status: str
    score: float | None
    ocr_text: str | None
    original_file_path: str | None
    processed_file_path: str | None
    created_at: datetime
    updated_at: datetime
