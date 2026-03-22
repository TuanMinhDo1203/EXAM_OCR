import { apiClient } from './client';
import { SubmissionGradeDetail } from '@/types/grade_detail';
import { Grade } from '@/types/grade';

export async function fetchSubmissionGrade(id: string): Promise<SubmissionGradeDetail> {
  return apiClient<SubmissionGradeDetail>('GET', `/api/grades/submission/${id}`);
}

export async function overrideGrade(gradeId: string, score: number, comment?: string): Promise<Grade> {
  return apiClient<Grade>('PATCH', `/api/grades/${gradeId}/override`, {
    teacher_override_score: score,
    teacher_comment: comment
  });
}
