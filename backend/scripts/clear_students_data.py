from __future__ import annotations

from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.database import SessionLocal
from app.models import ClassMember, Grade, Submission, SubmissionAnswer, SubmissionPage, User


def main() -> None:
    session = SessionLocal()
    try:
        student_ids = [item[0] for item in session.query(User.id).filter(User.role == "student").all()]
        if not student_ids:
            print("No student data found.")
            return

        submission_ids = [
            item[0]
            for item in session.query(Submission.id).filter(Submission.student_id.in_(student_ids)).all()
        ]

        counts: dict[str, int] = {}
        if submission_ids:
            counts["grades"] = session.query(Grade).filter(Grade.submission_id.in_(submission_ids)).delete(synchronize_session=False)
            counts["submission_answers"] = session.query(SubmissionAnswer).filter(
                SubmissionAnswer.submission_id.in_(submission_ids)
            ).delete(synchronize_session=False)
            counts["submission_pages"] = session.query(SubmissionPage).filter(
                SubmissionPage.submission_id.in_(submission_ids)
            ).delete(synchronize_session=False)
            counts["submissions"] = session.query(Submission).filter(
                Submission.id.in_(submission_ids)
            ).delete(synchronize_session=False)
        else:
            counts["grades"] = 0
            counts["submission_answers"] = 0
            counts["submission_pages"] = 0
            counts["submissions"] = 0

        counts["class_members"] = session.query(ClassMember).filter(ClassMember.student_id.in_(student_ids)).delete(synchronize_session=False)
        counts["users"] = session.query(User).filter(User.id.in_(student_ids)).delete(synchronize_session=False)
        session.commit()

        print("Student data cleared. Teacher data kept.")
        for table_name, deleted in counts.items():
            print(f"{table_name}: deleted {deleted}")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
