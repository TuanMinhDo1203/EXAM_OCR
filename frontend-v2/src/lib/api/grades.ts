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

export interface SubmissionPageUpdate {
  id: string;
  page_number: number;
  image_url: string;
  ocr_text: string;
  ocr_confidence: number;
  visualization_url: string | null;
}

export async function updateSubmissionPageOcrText(pageId: string, ocrText: string): Promise<SubmissionPageUpdate> {
  return apiClient<SubmissionPageUpdate>('PATCH', `/api/grades/submission-pages/${pageId}/ocr-text`, {
    ocr_text: ocrText,
  });
}
