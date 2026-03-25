import { Submission } from './submission';
import { Grade } from './grade';

export interface SubmissionGradeDetail {
  submission: Submission;
  pages: Array<{
    id: string;
    page_number: number;
    image_url: string;
    ocr_text: string;
    ocr_confidence: number;
    visualization_url: string | null;
  }>;
  grades: Grade[];
  total_score: number;
  max_possible_score: number;
}
