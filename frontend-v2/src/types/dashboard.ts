export interface DashboardStats {
  live_submission_rate: number;
  task_priority: { urgent: number; high: number; standard: number };
  avg_score: number;
  score_trend: number;
  confidence_risk: Array<{ exam_code: string; level: 'critical' | 'medium' | 'low' }>;
}
