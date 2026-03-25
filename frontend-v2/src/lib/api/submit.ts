import { apiClient, API_BASE_URL, ApiError } from './client';

export interface SubmitExamInfo {
  exam_title: string;
  subject: string;
  time_limit_minutes: number;
  status: string;
  class_name: string;
}

export interface SubmitStudentValidation {
  valid: boolean;
  student_id: string;
  student_email: string;
  student_display_name?: string | null;
}

export interface SubmitUploadResponse {
  success: boolean;
  submission_id: string;
  status: string;
  pages_created: number;
  processing_time: number;
  recognized_text: string;
  message?: string | null;
}

export async function fetchSubmitExamInfo(token: string): Promise<SubmitExamInfo> {
  const res = await fetch(`${API_BASE_URL}/api/submit/${token}`);
  if (!res.ok) {
    throw new ApiError(res.status, await res.text());
  }
  return res.json();
}

export async function validateSubmitStudent(token: string, studentEmail: string): Promise<SubmitStudentValidation> {
  return apiClient<SubmitStudentValidation>('POST', `/api/submit/${token}/validate-student`, {
    student_email: studentEmail,
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mime = mimeMatch?.[1] || 'image/jpeg';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

export async function uploadSubmission(token: string, imageDataUrl: string, studentEmail: string): Promise<SubmitUploadResponse> {
  const formData = new FormData();
  formData.append('file', dataUrlToBlob(imageDataUrl), 'submission.jpg');
  formData.append('student_email', studentEmail);

  const res = await fetch(`${API_BASE_URL}/api/submit/${token}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new ApiError(res.status, await res.text());
  }

  return res.json();
}
