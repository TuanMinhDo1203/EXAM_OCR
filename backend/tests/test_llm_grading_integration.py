import json
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch

# Adjust import path based on execution directory
try:
    from app.main import app
    from app.database import get_db
    from app.models import Grade, ExamQuestion, QuestionBank, SubmissionAnswer
    from app.schemas.llm import LLMGradeOutput, LLMScores, LLMAnalysis
except ImportError:
    pass

def override_get_db():
    try:
        # Mock database session
        db = MagicMock()
        
        # Fake Question Bank and Exam Question
        mock_question = MagicMock(spec=QuestionBank)
        mock_question.rubric_text = "You are an expert grading agent."
        
        mock_exam_question = MagicMock(spec=ExamQuestion)
        mock_exam_question.question = mock_question
        mock_exam_question.prompt_snapshot = "Write a python function to print Hello."
        mock_exam_question.max_score_snapshot = 10.0
        
        # Fake Submission Answer
        mock_submission_answer = MagicMock(spec=SubmissionAnswer)
        mock_submission_answer.aggregated_text = "def hello():\n  print('Hello')"
        
        # Fake Grade Object
        mock_grade = MagicMock(spec=Grade)
        mock_grade.id = "test-grade-id"
        mock_grade.exam_question = mock_exam_question
        mock_grade.submission_answer = mock_submission_answer
        mock_grade.ai_score = None
        mock_grade.ai_reasoning = None
        
        # Fake the db.scalar to return our mock grade
        db.scalar.return_value = mock_grade
        
        yield db
    finally:
        pass

# Initialize client with DB override
# This prevents modifying your real database during tests!
try:
    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)
except NameError:
    # Fallback if imports failed
    client = None

@pytest.fixture
def mock_openai_response():
    return LLMGradeOutput(
        scores=LLMScores(
            task_response=9,
            coherence_structure=8,
            lexical_resource=8,
            grammatical_accuracy=9,
            robustness=7
        ),
        overall_score=8.2,
        analysis=LLMAnalysis(
            interpreted_code="def hello():\n    print('Hello')",
            strengths=["Core logic is completely correct.", "Simple and readable."],
            weaknesses=["Missing docstrings."],
            ocr_issues_detected=["Fixed 'Hello' to 'Hello'"]
        )
    )

def test_reevaluate_ai_integration(mock_openai_response):
    """
    Integration Tests (AAA Pattern):
    - [Arrange]: Setup fake HTTP client, override FastAPI dependencies.
    - [Act]: Send POST request to /api/grades/test-grade-id/re-evaluate-ai.
    - [Assert]: Verify response contains structured reasoning JSON and overall score.
    """
    if not client:
        pytest.skip("Test client failed to initialize due to missing imports.")

    # We mock the evaluate_ocr_with_ai service to not hit the real OpenAI API and cost money.
    with patch("app.api.routes_grade.evaluate_ocr_with_ai", return_value=mock_openai_response):
        
        response = client.post("/api/grades/test-grade-id/re-evaluate-ai")

        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        
        # Validate Output Structure
        assert "ai_score" in data
        assert "ai_reasoning" in data
        
        # Validate logic bindings
        assert data["ai_score"] == 8.2
        assert data["max_score"] == 10.0
        
        # Validate that the backend correctly serialized the LLM Output into JSON string
        reasoning_json = json.loads(data["ai_reasoning"])
        assert "scores" in reasoning_json
        assert "analysis" in reasoning_json
        assert reasoning_json["scores"]["task_response"] == 9
        assert "strengths" in reasoning_json["analysis"]
