from fastapi import APIRouter, Header, Request

from app.schemas.grade_response import GradeRequest, GradeResponse
from app.services.grading import run_grade_demo
from app.utils.security import enforce_grading_access

router = APIRouter(prefix="/api/grade", tags=["grade"])


@router.post("/run", response_model=GradeResponse)
def run_grade(
    payload: GradeRequest,
    request: Request,
    x_internal_token: str | None = Header(default=None),
) -> GradeResponse:
    settings = request.app.state.settings
    enforce_grading_access(settings, x_internal_token)
    result = run_grade_demo(
        code=payload.code,
        test_input=payload.test_input,
        expected_output=payload.expected_output,
        settings=settings,
    )
    return GradeResponse(
        enabled=settings.enable_grading,
        internal_only=settings.internal_grading_only,
        **result,
    )
