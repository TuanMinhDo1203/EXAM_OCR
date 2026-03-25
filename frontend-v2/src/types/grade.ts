export interface Grade {
  id: string;
  submission_id: string;
  question_id: string;
  question_text: string;
  max_score: number;
  ai_score: number;
  ai_reasoning: string;
  ai_confidence: number;
  teacher_override_score: number | null;
  teacher_comment: string | null;
  is_human_reviewed: boolean;
  created_at: string;
}
