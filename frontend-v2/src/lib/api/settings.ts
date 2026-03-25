import { apiClient } from './client';

export interface OCRSettings {
  ocr_inference_mode: 'local' | 'remote';
  yolo_conf: number;
  yolo_iou: number;
  yolo_min_conf: number;
  trocr_num_beams: number;
  trocr_max_tokens: number;
  save_visualizations: boolean;
}

export async function fetchOcrSettings(): Promise<OCRSettings> {
  return apiClient<OCRSettings>('GET', '/api/settings/ocr');
}

export async function updateOcrSettings(payload: Partial<OCRSettings>): Promise<OCRSettings> {
  return apiClient<OCRSettings>('PATCH', '/api/settings/ocr', payload);
}
