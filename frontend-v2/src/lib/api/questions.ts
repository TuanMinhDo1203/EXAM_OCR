import { apiClient, API_BASE_URL } from './client';

export interface QuestionItem {
  id: string;
  teacher_id: string;
  subject: string;
  question_text: string;
  rubric_json?: string | null;
  expected_answer?: string | null;
  rubric_text?: string | null;
  max_score: number;
  created_at: string;
  updated_at?: string;
}

export interface GetQuestionsResponse {
  data: QuestionItem[];
  total: number;
}

export interface QuestionPayload {
  teacher_id: string;
  subject: string;
  question_text: string;
  expected_answer?: string | null;
  rubric_json?: string | null;
  rubric_text?: string | null;
  max_score: number;
}

export async function fetchQuestions(subject?: string, q?: string): Promise<GetQuestionsResponse> {
  const search = new URLSearchParams();
  if (subject) search.set('subject', subject);
  if (q) search.set('q', q);
  const query = search.toString() ? `?${search.toString()}` : '';
  return apiClient<GetQuestionsResponse>('GET', `/api/questions${query}`);
}

export async function createQuestion(payload: QuestionPayload): Promise<QuestionItem> {
  return apiClient<QuestionItem>('POST', '/api/questions', payload);
}

export async function updateQuestion(id: string, payload: Partial<QuestionPayload>): Promise<QuestionItem> {
  return apiClient<QuestionItem>('PATCH', `/api/questions/${id}`, payload);
}

export async function deleteQuestion(id: string): Promise<void> {
  return apiClient<void>('DELETE', `/api/questions/${id}`);
}

export async function importQuestions(teacherId: string, file: File): Promise<{
  success: boolean;
  rows_read: number;
  created: number;
  updated: number;
  skipped_rows: number;
}> {
  const formData = new FormData();
  formData.append('teacher_id', teacherId);
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/api/questions/import`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}
