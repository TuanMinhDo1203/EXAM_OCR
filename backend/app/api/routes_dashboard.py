from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ExamBatch, Grade, Submission, SubmissionPage

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)) -> dict:
    total_submissions = int(db.scalar(select(func.count(Submission.id))) or 0)
    avg_score = float(
        db.scalar(select(func.avg(func.coalesce(Grade.teacher_override_score, Grade.ai_score)))) or 0.0
    )
    confidence_risk = []
    active_exams = list(
        db.scalars(
            select(ExamBatch)
            .where(ExamBatch.status == "active")
            .order_by(ExamBatch.created_at.desc())
            .limit(6)
        ).all()
    )

    critical_count = 0
    medium_count = 0
    low_count = 0

    for exam in active_exams:
        avg_confidence = float(
            db.scalar(
                select(func.avg(SubmissionPage.ocr_confidence))
                .join(Submission, Submission.id == SubmissionPage.submission_id)
                .where(Submission.exam_batch_id == exam.id)
            )
            or 0.0
        )

        if avg_confidence == 0.0:
            level = "medium"
        elif avg_confidence < 0.75:
            level = "critical"
        elif avg_confidence < 0.9:
            level = "medium"
        else:
            level = "low"

        if level == "critical":
            critical_count += 1
        elif level == "medium":
            medium_count += 1
        else:
            low_count += 1

        confidence_risk.append(
            {
                "exam_code": exam.qr_token,
                "level": level,
            }
        )

    tracked_exam_count = len(active_exams)
    urgent_percent = round((critical_count / tracked_exam_count) * 100) if tracked_exam_count else 0

    return {
        "live_submission_rate": total_submissions,
        "task_priority": {
            "urgent": urgent_percent,
            "high": medium_count,
            "standard": low_count,
        },
        "avg_score": round(avg_score, 1),
        "score_trend": 0.0,
        "confidence_risk": confidence_risk[:3],
    }
