from pydantic import BaseModel, Field

class LLMScores(BaseModel):
    task_response: int = Field(description="Does the code solve the problem? Is the core logic present and correct?", ge=0, le=9)
    coherence_structure: int = Field(description="Logical flow of the code, proper structure (loops, conditions), readability despite OCR noise", ge=0, le=9)
    lexical_resource: int = Field(description="Correct use of programming constructs, flexibility in expression of logic", ge=0, le=9)
    grammatical_accuracy: int = Field(description="Syntax correctness. Penalize only when syntax breaks execution logic", ge=0, le=9)
    robustness: int = Field(description="Handles edge cases, input validation or defensive logic", ge=0, le=9)

class LLMAnalysis(BaseModel):
    interpreted_code: str = Field(description="The reconstructed intended code after cleaning OCR noise")
    strengths: list[str] = Field(description="List of strengths in the student's code")
    weaknesses: list[str] = Field(description="List of weaknesses or logic errors")
    ocr_issues_detected: list[str] = Field(description="List of detected OCR noise or issues")

class LLMGradeOutput(BaseModel):
    scores: LLMScores = Field(description="Individual scores for evaluation criteria")
    overall_score: float = Field(description="The overall aggregated score out of 9", ge=0, le=9)
    analysis: LLMAnalysis = Field(description="Detailed analysis and reasoning")
