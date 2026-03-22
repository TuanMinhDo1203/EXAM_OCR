export interface Exam {
  id: string;
  class_id: string;
  title: string;
  subject: string;
  time_limit_minutes: number;
  qr_code_url: string;
  qr_token: string;
  status: 'draft' | 'active' | 'closed' | 'finalized';
  total_submissions: number;
  total_expected: number;
  avg_confidence: number;
  avg_score: number;
  created_at: string;
  closed_at: string | null;
}
