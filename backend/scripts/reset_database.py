from __future__ import annotations

from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.database import SessionLocal
from app.models import (
    Class,
    ClassMember,
    ExamBatch,
    ExamQuestion,
    Grade,
    QuestionBank,
    Submission,
    SubmissionAnswer,
    SubmissionPage,
    User,
)


def main() -> None:
    session = SessionLocal()
    try:
        delete_order = [
            Grade,
            SubmissionAnswer,
            SubmissionPage,
            Submission,
            ExamQuestion,
            ExamBatch,
            QuestionBank,
            ClassMember,
            Class,
            User,
        ]
        counts: dict[str, int] = {}
        for model in delete_order:
            deleted = session.query(model).delete()
            counts[model.__tablename__] = deleted
        session.commit()
        print("Database reset completed.")
        for table_name, deleted in counts.items():
            print(f"{table_name}: deleted {deleted}")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
