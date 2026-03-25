import { apiClient } from './client';

export interface UserItem {
  id: string;
  email: string;
  display_name?: string | null;
  avatar_url?: string | null;
  role: string;
  google_sub: string;
  created_at: string;
  updated_at: string;
}

export async function fetchUsers(role?: string): Promise<UserItem[]> {
  const query = role ? `?role=${encodeURIComponent(role)}` : '';
  return apiClient<UserItem[]>('GET', `/api/users${query}`);
}

