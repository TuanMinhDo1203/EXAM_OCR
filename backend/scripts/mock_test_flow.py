import sys
import os
import requests
import json
import uuid

# Add the backend directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models import User, Class, ExamBatch, QuestionBank, ExamQuestion, Submission, SubmissionAnswer, Grade

def test_full_flow():
    print("--- 1. STARTING DATABASE INJECTION ---")
    db = SessionLocal()
    
    try:
        # Create a dummy Teacher and Student
        teacher = User(id=uuid.UUID(int=1), email=f"t@mock{uuid.uuid4().hex[:4]}.com", display_name="Teacher", role="teacher", google_sub=uuid.uuid4().hex)
        student = User(id=uuid.UUID(int=2), email=f"s@mock{uuid.uuid4().hex[:4]}.com", display_name="Student", role="student", google_sub=uuid.uuid4().hex)
        db.merge(teacher)
        db.merge(student)

        # Create Class and ExamBatch
        cls = Class(id=uuid.UUID(int=3), name="Mock Class", subject="Python", join_code=uuid.uuid4().hex[:6], teacher_id=teacher.id)
        db.merge(cls)
        
        exam = ExamBatch(id=uuid.UUID(int=4), class_id=cls.id, teacher_id=teacher.id, title="Mock Test", status="active", time_limit_minutes=45, qr_token=uuid.uuid4().hex[:10])
        db.merge(exam)
        
        # Create QuestionBank & ExamQuestion
        q = QuestionBank(id=uuid.UUID(int=5), teacher_id=teacher.id, subject="Python", question_text="Viết đệ quy", max_score=10.0, rubric_text="Chấm nương tay nếu đúng logic đệ quy")
        db.merge(q)
        
        eq = ExamQuestion(id=uuid.UUID(int=6), exam_batch_id=exam.id, question_id=q.id, order_index=1, prompt_snapshot=q.question_text, max_score_snapshot=q.max_score)
        db.merge(eq)
        
        # Create Submission & Answer
        sub = Submission(id=uuid.UUID(int=7), exam_batch_id=exam.id, student_id=student.id, status="verified", attempt_no=1)
        db.merge(sub)
        
        ans = SubmissionAnswer(id=uuid.UUID(int=8), submission_id=sub.id, exam_question_id=eq.id, aggregated_text="def faktorial(n):\n  if n == 1 returm 1\n  returm n * fctorial(n - 1)\n", needs_review=False)
        db.merge(ans)
        
        # Create Grade
        grade_id = uuid.uuid4()
        grd = Grade(id=grade_id, submission_id=sub.id, exam_question_id=eq.id, submission_answer_id=ans.id, is_human_reviewed=False)
        db.add(grd)
        db.commit()
    
        print(f"[OK] Injected Mock Data successfully! Grade ID: {grade_id}")
        
    except Exception as e:
        print("Database exception:", e)
        db.rollback()
        raise e
    finally:
        db.close()

    print("\n--- 2. TRIGGERING AI RE-EVALUATE ENDPOINT ---")
    url = f"http://localhost:8000/api/grades/{grade_id}/re-evaluate-ai"
    print(f"Making POST request to {url} ...")
    
    response = requests.post(url)
    
    print(f"\nResponse Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("\n--- 3. OPENAI GPT-4o RESULT ---")
        print(f"Overall AI Score: {data.get('ai_score')} / 10")
        reasoning = data.get('ai_reasoning', '{}')
        parsed = json.loads(reasoning)
        print("\n[AI Detailed JSON Reasoning]:")
        print(json.dumps(parsed, indent=4, ensure_ascii=False))
        print("\n[TEST COMPLETED SUCCESSFULLY!]")
    else:
        print("Error from backend:", response.text)

if __name__ == "__main__":
    test_full_flow()
