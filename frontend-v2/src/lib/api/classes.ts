import { apiClient, API_BASE_URL } from './client';

export interface ClassItem {
  id: string;
  name: string;
  subject: string;
  join_code: string;
  teacher_id?: string;
  created_at?: string;
  updated_at?: string;
  member_count?: number;
}

export async function fetchClasses(): Promise<ClassItem[]> {
  return apiClient<ClassItem[]>('GET', '/api/classes');
}

export interface ClassPayload {
  name: string;
  subject: string;
  join_code: string;
  teacher_id: string;
}

export interface ClassMemberItem {
  id: string;
  class_id: string;
  student_id: string;
  email: string;
  display_name?: string | null;
  status: string;
  joined_at: string;
  left_at?: string | null;
}

export async function createClass(payload: ClassPayload): Promise<ClassItem> {
  return apiClient<ClassItem>('POST', '/api/classes', payload);
}

export async function updateClass(id: string, payload: Partial<ClassPayload>): Promise<ClassItem> {
  return apiClient<ClassItem>('PATCH', `/api/classes/${id}`, payload);
}

export async function deleteClass(id: string): Promise<void> {
  return apiClient<void>('DELETE', `/api/classes/${id}`);
}

export async function fetchClassMembers(classId: string): Promise<ClassMemberItem[]> {
  return apiClient<ClassMemberItem[]>('GET', `/api/classes/${classId}/members`);
}

export async function addClassMember(classId: string, payload: { email: string; display_name?: string }): Promise<ClassMemberItem> {
  return apiClient<ClassMemberItem>('POST', `/api/classes/${classId}/members`, payload);
}

export async function removeClassMember(classId: string, memberId: string): Promise<void> {
  return apiClient<void>('DELETE', `/api/classes/${classId}/members/${memberId}`);
}

export async function importClassMembers(classId: string, file: File): Promise<{
  success: boolean;
  rows_read: number;
  created_students: number;
  added_memberships: number;
  reactivated_memberships: number;
  skipped_rows: number;
}> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/api/classes/${classId}/members/import`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res.json();
}
