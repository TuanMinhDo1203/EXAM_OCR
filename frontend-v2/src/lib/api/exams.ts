import { apiClient, API_BASE_URL } from './client';
import { Exam } from '@/types/exam';

export interface GetExamsResponse {
  data: Exam[];
  total: number;
}

export async function fetchExams(status?: 'active' | 'closed' | 'finalized'): Promise<GetExamsResponse> {
  const query = status ? `?status=${status}` : '';
  return apiClient<GetExamsResponse>('GET', `/api/exams${query}`);
}

export interface ExamDetail extends Exam {
  submissions: any[]; // will import Submission type
  questions: any[];
}

export async function fetchExamDetail(id: string): Promise<ExamDetail> {
  return apiClient<ExamDetail>('GET', `/api/exams/${id}`);
}

export interface CreateExamPayload {
  class_id: string;
  title: string;
  subject?: string;
  time_limit_minutes: number;
  question_ids: string[];
  rubric_text?: string;
}

export async function createExam(payload: CreateExamPayload): Promise<Exam> {
  return apiClient<Exam>('POST', '/api/exams', payload);
}

export async function finalizeExam(id: string): Promise<Exam> {
  return apiClient<Exam>('PATCH', `/api/exams/${id}/finalize`);
}

export async function exportExamCsv(id: string, qrToken: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/exams/${id}/export`);
  if (!res.ok) {
    throw new Error(await res.text());
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `exam_${qrToken}_submissions.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function deleteSubmission(examId: string, submissionId: string): Promise<void> {
  await apiClient<void>('DELETE', `/api/exams/${examId}/submissions/${submissionId}`);
}
