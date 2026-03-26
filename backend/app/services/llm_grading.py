import json
import logging
from openai import OpenAI
from app.core.config import get_settings
from app.schemas.llm import LLMGradeOutput

logger = logging.getLogger(__name__)

def evaluate_ocr_with_ai(system_prompt: str, problem_description: str, ocr_text: str) -> LLMGradeOutput | None:
    settings = get_settings()
    if not settings.openai_api_key:
        logger.warning("OPENAI_API_KEY is not set. Skipping AI grading.")
        return None
        
    client = OpenAI(api_key=settings.openai_api_key)
    
    full_system_instruction = f"{system_prompt}\n\nProblem Description:\n{problem_description}"
    
    try:
        response = client.beta.chat.completions.parse(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": full_system_instruction},
                {"role": "user", "content": f"OCR extracted code to evaluate:\n\n{ocr_text}"}
            ],
            response_format=LLMGradeOutput,
        )
        return response.choices[0].message.parsed
    except Exception as e:
        logger.error(f"Error during OpenAI AI grading: {e}")
        return None
