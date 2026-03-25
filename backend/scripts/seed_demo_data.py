from __future__ import annotations

from decimal import Decimal
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.database import SessionLocal
from app.models import Class, ClassMember, QuestionBank, User


def get_or_create_user(session, *, email: str, display_name: str, role: str, google_sub: str) -> User:
    item = session.query(User).filter(User.email == email).one_or_none()
    if item is not None:
        item.display_name = display_name
        item.role = role
        item.google_sub = google_sub
        return item

    item = User(
        email=email,
        display_name=display_name,
        role=role,
        google_sub=google_sub,
    )
    session.add(item)
    session.flush()
    return item


def get_or_create_class(session, *, teacher_id, name: str, subject: str, join_code: str) -> Class:
    item = session.query(Class).filter(Class.join_code == join_code).one_or_none()
    if item is not None:
        item.name = name
        item.subject = subject
        item.teacher_id = teacher_id
        return item

    item = Class(
        teacher_id=teacher_id,
        name=name,
        subject=subject,
        join_code=join_code,
    )
    session.add(item)
    session.flush()
    return item


def ensure_membership(session, *, class_id, student_id) -> None:
    item = (
        session.query(ClassMember)
        .filter(ClassMember.class_id == class_id, ClassMember.student_id == student_id)
        .one_or_none()
    )
    if item is not None:
        item.status = "active"
        item.left_at = None
        return

    session.add(
        ClassMember(
            class_id=class_id,
            student_id=student_id,
            status="active",
        )
    )


def get_or_create_question(
    session,
    *,
    teacher_id,
    subject: str,
    question_text: str,
    expected_answer: str,
    rubric_text: str,
    max_score: Decimal,
) -> QuestionBank:
    item = (
        session.query(QuestionBank)
        .filter(
            QuestionBank.teacher_id == teacher_id,
            QuestionBank.question_text == question_text,
        )
        .one_or_none()
    )
    if item is not None:
        item.subject = subject
        item.expected_answer = expected_answer
        item.rubric_text = rubric_text
        item.max_score = max_score
        return item

    item = QuestionBank(
        teacher_id=teacher_id,
        subject=subject,
        question_text=question_text,
        expected_answer=expected_answer,
        rubric_text=rubric_text,
        max_score=max_score,
    )
    session.add(item)
    session.flush()
    return item


def main() -> None:
    session = SessionLocal()
    try:
        teacher = get_or_create_user(
            session,
            email="thay.python@fpt.edu.vn",
            display_name="Thầy Nguyễn Python",
            role="teacher",
            google_sub="demo-teacher-python",
        )
        student_tam = get_or_create_user(
            session,
            email="phanthitam@fpt.edu.vn",
            display_name="Phan Thị Tâm",
            role="student",
            google_sub="demo-student-tam",
        )
        student_do = get_or_create_user(
            session,
            email="phancongdo@fpt.edu.vn",
            display_name="Phan Công Dô",
            role="student",
            google_sub="demo-student-do",
        )

        class_item = get_or_create_class(
            session,
            teacher_id=teacher.id,
            name="Python OCR Demo - SE1842",
            subject="Python Programming",
            join_code="PY1842",
        )

        ensure_membership(session, class_id=class_item.id, student_id=student_tam.id)
        ensure_membership(session, class_id=class_item.id, student_id=student_do.id)

        questions = [
            get_or_create_question(
                session,
                teacher_id=teacher.id,
                subject="Python Programming",
                question_text="Write a Python function `is_prime(n)` that returns True if n is a prime number and False otherwise.",
                expected_answer="A correct solution should reject n < 2, loop up to sqrt(n), and return a boolean.",
                rubric_text="Award full score for correct primality logic, early rejection of n < 2, and efficient divisor checking up to sqrt(n). Deduct points for syntax errors or wrong edge-case handling.",
                max_score=Decimal('10.00'),
            ),
            get_or_create_question(
                session,
                teacher_id=teacher.id,
                subject="Python Programming",
                question_text="Given a list of integers, write Python code to return a new list containing only the even numbers using list comprehension.",
                expected_answer="Example: [x for x in numbers if x % 2 == 0]",
                rubric_text="Award full score for valid list comprehension syntax and correct even-number filter. Deduct points for loops without comprehension or incorrect condition.",
                max_score=Decimal('5.00'),
            ),
            get_or_create_question(
                session,
                teacher_id=teacher.id,
                subject="Python Programming",
                question_text="Explain the difference between a Python list and a tuple, and give one situation where tuple is preferred.",
                expected_answer="Lists are mutable, tuples are immutable. Tuple is preferred for fixed records or hashable values.",
                rubric_text="Award full score if the answer clearly states mutability difference and provides one valid tuple use case. Deduct points if explanation is vague or incorrect.",
                max_score=Decimal('5.00'),
            ),
            get_or_create_question(
                session,
                teacher_id=teacher.id,
                subject="Python Programming",
                question_text=(
                    "Viết chương trình Python yêu cầu người dùng nhập vào một số nguyên chẵn dương n. "
                    "Nếu dữ liệu nhập không hợp lệ, chương trình phải yêu cầu nhập lại. "
                    "Sau khi nhập đúng, hãy in ra mẫu dấu * đối xứng tương ứng với số n."
                ),
                expected_answer=(
                    "Chương trình phải kiểm tra n là số nguyên chẵn lớn hơn 0, lặp lại khi nhập sai, "
                    "và sau đó in ra pattern đối xứng bằng dấu * theo giá trị n."
                ),
                rubric_text=(
                    "Chấm điểm theo 4 ý: (1) kiểm tra và yêu cầu nhập lại khi dữ liệu không hợp lệ; "
                    "(2) chỉ chấp nhận số nguyên chẵn dương; "
                    "(3) in đúng pattern đối xứng bằng dấu *; "
                    "(4) code Python đúng cú pháp, rõ ràng, dễ đọc."
                ),
                max_score=Decimal('10.00'),
            ),
        ]

        session.commit()

        print("Seed completed.")
        print(f"teacher_id={teacher.id}")
        print(f"student_tam_id={student_tam.id}")
        print(f"student_do_id={student_do.id}")
        print(f"class_id={class_item.id}")
        print("question_ids=" + ",".join(str(item.id) for item in questions))
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
