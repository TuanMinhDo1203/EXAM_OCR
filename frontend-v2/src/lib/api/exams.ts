import { apiClient } from './client';
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
