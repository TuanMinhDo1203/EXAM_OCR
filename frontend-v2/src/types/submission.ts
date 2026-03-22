export interface Submission {
  id: string;
  exam_batch_id: string;
  student: { id: string; display_name: string; avatar_url: string };
  scanned_pages: number;
  ocr_status: 'pending' | 'processing' | 'verified' | 'attention';
  ai_feedback: string;
  score: number | null;
  max_score: number;
  submitted_at: string;
}
