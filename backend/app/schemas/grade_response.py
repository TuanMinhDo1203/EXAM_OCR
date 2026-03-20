from pydantic import BaseModel


class GradeRequest(BaseModel):
    code: str
    test_input: str
    expected_output: str


class GradeResponse(BaseModel):
    success: bool
    enabled: bool
    internal_only: bool
    result: str
    code_status: str | None = None
    test_status: str | None = None
    num_functions: int | None = None
    error: str | None = None
