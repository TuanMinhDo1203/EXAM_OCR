from pydantic import BaseModel, Field


class BoxRecord(BaseModel):
    box: list[int]
    class_name: str
    confidence: float
    indent_level: int | None = None
    text: str | None = None


class OCRResponse(BaseModel):
    success: bool
    filename: str
    recognized_text: str = ""
    boxes: list[BoxRecord] = Field(default_factory=list)
    processing_time: float
    stage_timings: dict[str, float] = Field(default_factory=dict)
    visualization_path: str | None = None
    request_id: str
    error: str | None = None
