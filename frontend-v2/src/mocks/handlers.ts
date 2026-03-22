// Basic mock handler for EXAM_OCR API contract
export async function getMockResponse<T>(
  method: string, 
  path: string, 
  body?: unknown
): Promise<T> {
  console.log(`[MOCK] ${method} ${path}`, body ? body : '');

  // Wait a bit to simulate network
  await new Promise(resolve => setTimeout(resolve, 800));

  if (method === 'GET' && path === '/api/dashboard/stats') {
    return {
      live_submission_rate: 124,
      task_priority: { urgent: 75, high: 15, standard: 10 },
      avg_score: 68.4,
      score_trend: 4.2,
      confidence_risk: [
        { exam_code: "MTH-202", level: "critical" },
        { exam_code: "BIO-105", level: "medium" },
        { exam_code: "ENG-404", level: "medium" }
      ]
    } as unknown as T;
  }

  if (method === 'GET' && path === '/api/auth/me') {
    return {
      id: "usr_001",
      email: "prof.alabaster@school.edu",
      display_name: "Prof. Alabaster",
      avatar_url: "https://ui-avatars.com/api/?name=Prof+Alabaster",
      role: "teacher",
      created_at: "2026-01-15T08:00:00Z"
    } as unknown as T;
  }

  // Fallback
  throw new Error(`Mock not implemented for ${method} ${path}`);
}
