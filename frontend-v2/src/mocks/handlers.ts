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

  if (method === 'GET' && path.startsWith('/api/exams')) {
    return {
      data: [
        {
          id: "exam_001",
          class_id: "cls_001",
          title: "Advanced Calculus II",
          subject: "Mathematics",
          time_limit_minutes: 45,
          qr_code_url: "https://api.qrserver.com/v1/create-qr-code/?data=exam_001",
          qr_token: "MTH402-2026",
          status: "active",
          total_submissions: 48,
          total_expected: 50,
          avg_confidence: 0.982,
          avg_score: 76.2,
          created_at: "2026-10-24T08:00:00Z",
          closed_at: null
        },
        {
          id: "exam_002",
          class_id: "cls_002",
          title: "Introductory Physics",
          subject: "Physics",
          time_limit_minutes: 30,
          qr_code_url: "https://api.qrserver.com/v1/create-qr-code/?data=exam_002",
          qr_token: "PHY101-2026",
          status: "closed",
          total_submissions: 120,
          total_expected: 120,
          avg_confidence: 0.62,
          avg_score: 64.5,
          created_at: "2026-10-22T08:00:00Z",
          closed_at: "2026-10-23T08:00:00Z"
        }
      ],
      total: 2
    } as unknown as T;
  }

  // Fallback
  throw new Error(`Mock not implemented for ${method} ${path}`);
}
