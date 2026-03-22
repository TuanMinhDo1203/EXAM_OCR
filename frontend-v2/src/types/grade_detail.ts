import { Submission } from './submission';
import { Grade } from './grade';

export interface SubmissionGradeDetail {
  submission: Submission;
  pages: Array<{
    page_number: number;
    image_url: string;
    ocr_text: string;
    ocr_confidence: number;
    visualization_url: string;
  }>;
  grades: Grade[];
  total_score: number;
  max_possible_score: number;
}
