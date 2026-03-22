import { apiClient } from './client';
import { DashboardStats } from '@/types/dashboard';

export async function fetchDashboardStats(): Promise<DashboardStats> {
  return apiClient<DashboardStats>('GET', '/api/dashboard/stats');
}
