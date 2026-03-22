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
