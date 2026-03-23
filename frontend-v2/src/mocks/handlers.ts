// Basic mock handler for EXAM_OCR API contract
export async function getMockResponse<T>(
  method: string, 
  path: string, 
  body?: unknown
): Promise<T> {
  console.log(`[MOCK] ${method} ${path}`, body ? body : '');

  // Mô phỏng độ trễ mạng
  await new Promise(resolve => setTimeout(resolve, 600));

  // ─── AUTH ───────────────────────────────────────────────
  if (method === 'GET' && path === '/api/auth/me') {
    return {
      id: "usr_001",
      email: "nguyenvana@fpt.edu.vn",
      display_name: "Thầy Nguyễn Văn A",
      avatar_url: "https://ui-avatars.com/api/?name=NVA&background=4849da&color=fff",
      role: "teacher",
      created_at: "2026-01-15T08:00:00Z"
    } as unknown as T;
  }

  // ─── DASHBOARD STATS ─────────────────────────────────────
  if (method === 'GET' && path === '/api/dashboard/stats') {
    return {
      live_submission_rate: 87,
      task_priority: { urgent: 68, high: 20, standard: 12 },
      avg_score: 72.4,
      score_trend: 3.8,
      confidence_risk: [
        { exam_code: "TOÁN-202", level: "critical" },
        { exam_code: "LÝ-105", level: "medium" },
        { exam_code: "ANH-404", level: "medium" }
      ]
    } as unknown as T;
  }

  // ─── EXAM DETAIL (phải đứng trước list) ──────────────────
  if (method === 'GET' && path.match(/^\/api\/exams\/[^/]+$/)) {
    const parts = path.split('/');
    const id = parts[parts.length - 1];
    return {
      id: id,
      class_id: "cls_001",
      title: "Kiểm tra Giữa Kỳ — Giải Tích 1",
      subject: "Toán học",
      time_limit_minutes: 45,
      qr_code_url: "https://api.qrserver.com/v1/create-qr-code/?data=" + id,
      qr_token: "TOAN402-2026",
      status: "active",
      total_submissions: 38,
      total_expected: 42,
      avg_confidence: 0.92,
      avg_score: 74.5,
      created_at: "2026-10-24T08:00:00Z",
      closed_at: null,
      submissions: [
        {
          id: "sub_001",
          exam_batch_id: id,
          student: {
            id: "std_001",
            display_name: "Nguyễn Thị Bảo Châu",
            avatar_url: "https://ui-avatars.com/api/?name=NBC&background=e1e0ff&color=3b3acd"
          },
          scanned_pages: 3,
          ocr_status: "verified",
          ai_feedback: "Trình bày rõ ràng, áp dụng đúng quy tắc L'Hôpital.",
          score: 88,
          max_score: 100,
          submitted_at: "2026-10-24T08:15:00Z"
        },
        {
          id: "sub_002",
          exam_batch_id: id,
          student: {
            id: "std_002",
            display_name: "Trần Minh Khoa",
            avatar_url: "https://ui-avatars.com/api/?name=TMK&background=caebcd&color=3c5842"
          },
          scanned_pages: 2,
          ocr_status: "attention",
          ai_feedback: "Chữ viết trang 2 khó đọc, cần xác minh thủ công.",
          score: 65,
          max_score: 100,
          submitted_at: "2026-10-24T08:22:00Z"
        },
        {
          id: "sub_003",
          exam_batch_id: id,
          student: {
            id: "std_003",
            display_name: "Lê Phương Linh",
            avatar_url: "https://ui-avatars.com/api/?name=LPL&background=fec38c&color=633d11"
          },
          scanned_pages: 3,
          ocr_status: "verified",
          ai_feedback: "Giải tích phân đúng nhưng thiếu hằng số C ở câu 3.",
          score: 79,
          max_score: 100,
          submitted_at: "2026-10-24T08:31:00Z"
        },
        {
          id: "sub_004",
          exam_batch_id: id,
          student: {
            id: "std_004",
            display_name: "Phạm Đức Huy",
            avatar_url: "https://ui-avatars.com/api/?name=PDH&background=fe8b70&color=742410"
          },
          scanned_pages: 2,
          ocr_status: "pending",
          ai_feedback: "Đang xử lý OCR...",
          score: null,
          max_score: 100,
          submitted_at: "2026-10-24T08:45:00Z"
        }
      ],
      questions: []
    } as unknown as T;
  }

  // ─── EXAMS LIST ───────────────────────────────────────────
  if (method === 'GET' && path === '/api/exams') {
    return {
      data: [
        {
          id: "exam_001",
          class_id: "cls_001",
          title: "Kiểm tra Giữa Kỳ — Giải Tích 1",
          subject: "Toán học",
          time_limit_minutes: 45,
          qr_code_url: "https://api.qrserver.com/v1/create-qr-code/?data=exam_001",
          qr_token: "TOAN402-2026",
          status: "active",
          total_submissions: 38,
          total_expected: 42,
          avg_confidence: 0.92,
          avg_score: 74.5,
          created_at: "2026-10-24T08:00:00Z",
          closed_at: null
        },
        {
          id: "exam_002",
          class_id: "cls_002",
          title: "Kiểm tra Cuối Kỳ — Vật Lý Đại Cương",
          subject: "Vật lý",
          time_limit_minutes: 60,
          qr_code_url: "https://api.qrserver.com/v1/create-qr-code/?data=exam_002",
          qr_token: "VL101-2026",
          status: "closed",
          total_submissions: 55,
          total_expected: 55,
          avg_confidence: 0.58,
          avg_score: 61.2,
          created_at: "2026-10-22T08:00:00Z",
          closed_at: "2026-10-23T08:00:00Z"
        },
        {
          id: "exam_003",
          class_id: "cls_003",
          title: "Bài Tập Lớn — Lịch Sử Việt Nam",
          subject: "Lịch sử",
          time_limit_minutes: 90,
          qr_code_url: "https://api.qrserver.com/v1/create-qr-code/?data=exam_003",
          qr_token: "LS305-2026",
          status: "active",
          total_submissions: 41,
          total_expected: 45,
          avg_confidence: 0.95,
          avg_score: 80.1,
          created_at: "2026-10-20T08:00:00Z",
          closed_at: null
        }
      ],
      total: 3
    } as unknown as T;
  }

  // ─── GRADES / KẾT QUẢ BÀI NỘP ──────────────────────────────
  if (method === 'GET' && path.match(/^\/api\/grades\/submission\/[^/]+$/)) {
    const parts = path.split('/');
    const id = parts[parts.length - 1];
    return {
      submission: {
        id: id,
        exam_batch_id: "exam_001",
        student: { id: "std_001", display_name: "Nguyễn Thị Bảo Châu", avatar_url: "https://ui-avatars.com/api/?name=NBC" },
        scanned_pages: 3,
        ocr_status: "verified",
        ai_feedback: "Trình bày rõ ràng, áp dụng đúng quy tắc L'Hôpital.",
        score: 88,
        max_score: 100,
        submitted_at: "2026-10-24T08:15:00Z"
      },
      pages: [
        {
          page_number: 1,
          image_url: "https://via.placeholder.com/600x800/e1e0ff/3b3acd?text=Bai_lam_trang_1.png",
          ocr_text: "Câu 1: Tính giới hạn lim(x→0) sin(x)/x = 1. Áp dụng quy tắc L'Hôpital...",
          ocr_confidence: 0.97,
          visualization_url: "https://via.placeholder.com/600x800/caebcd/3c5842?text=OCR_Visualization.png"
        }
      ],
      grades: [
        {
          id: "grd_001",
          submission_id: id,
          question_id: "q_001",
          ai_score: 20,
          ai_reasoning: "Sinh viên áp dụng đúng L'Hôpital, kết quả chính xác. Trừ 0 điểm.",
          ai_confidence: 0.97,
          teacher_override_score: null,
          teacher_comment: null,
          is_human_reviewed: false,
          created_at: "2026-10-24T08:16:00Z"
        },
        {
          id: "grd_002",
          submission_id: id,
          question_id: "q_002",
          ai_score: 15,
          ai_reasoning: "Tích phân bộ phận đúng phương pháp, nhưng mắc lỗi dấu ở bước cuối. Trừ 5 điểm.",
          ai_confidence: 0.88,
          teacher_override_score: null,
          teacher_comment: null,
          is_human_reviewed: false,
          created_at: "2026-10-24T08:16:10Z"
        }
      ],
      total_score: 88,
      max_possible_score: 100
    } as unknown as T;
  }

  // ─── CLASSES ──────────────────────────────────────────────
  if (method === 'GET' && path === '/api/classes') {
    return [
      { id: "cls_001", name: "Toán Cao Cấp A1 — Nhóm 3", subject: "Toán học", join_code: "TOAN-A1-2026", member_count: 42 },
      { id: "cls_002", name: "Vật Lý Đại Cương — Nhóm 7", subject: "Vật lý", join_code: "VL-DC-2026", member_count: 55 },
      { id: "cls_003", name: "Lịch Sử Việt Nam — SE1701", subject: "Lịch sử", join_code: "LS-VN-2026", member_count: 45 },
    ] as unknown as T;
  }

  // ─── QUESTIONS ───────────────────────────────────────────
  if (method === 'GET' && path.startsWith('/api/questions')) {
    return {
      data: [
        {
          id: "q_001",
          teacher_id: "usr_001",
          subject: "Toán học",
          question_text: "Tính giới hạn: lim(x→0) [sin(3x) / x]",
          expected_answer: "3",
          rubric_text: "Đúng phương pháp giới hạn hoặc L'Hôpital. Cho điểm tối đa nếu kết quả = 3 và có bước trung gian.",
          max_score: 20,
          created_at: "2026-09-01T07:00:00Z"
        },
        {
          id: "q_002",
          teacher_id: "usr_001",
          subject: "Toán học",
          question_text: "Tính tích phân: ∫ x·ln(x) dx",
          expected_answer: "(x²/2)·ln(x) − x²/4 + C",
          rubric_text: "Yêu cầu tích phân bộ phận. Có hằng số C. Trừ 5đ nếu sai dấu.",
          max_score: 20,
          created_at: "2026-09-01T07:30:00Z"
        },
        {
          id: "q_003",
          teacher_id: "usr_001",
          subject: "Vật lý",
          question_text: "Một vật có khối lượng 2kg chuyển động với vận tốc 3 m/s. Tính động năng.",
          expected_answer: "Ek = 9 J",
          rubric_text: "Áp dụng Ek = 1/2·m·v². Đúng công thức 5đ, đúng đơn vị 5đ, đúng kết quả 10đ.",
          max_score: 20,
          created_at: "2026-09-05T08:00:00Z"
        }
      ],
      total: 3
    } as unknown as T;
  }

  // ─── LOBBY ──────────────────────────────────────────────
  if (method === 'GET' && path.match(/^\/api\/lobby\/[^/]+$/)) {
    return {
      exam_id: "exam_001",
      title: "Kiểm tra Giữa Kỳ — Giải Tích 1",
      pin: "8429",
      status: "waiting",
      connected_students: [
        { id: "std_001", display_name: "Nguyễn Thị Bảo Châu", joined_at: new Date().toISOString() },
        { id: "std_002", display_name: "Trần Minh Khoa", joined_at: new Date().toISOString() },
        { id: "std_003", display_name: "Lê Phương Linh", joined_at: new Date().toISOString() },
      ]
    } as unknown as T;
  }

  // ─── SUBMIT LANDING ───────────────────────────────────────
  if (method === 'GET' && path.startsWith('/api/submit/')) {
    return {
      exam_title: "Kiểm tra Giữa Kỳ — Giải Tích 1",
      subject: "Toán học",
      time_limit_minutes: 45,
      status: "active",
      class_name: "Toán Cao Cấp A1 — Nhóm 3"
    } as unknown as T;
  }

  // Fallback
  throw new Error(`Mock chưa được triển khai: ${method} ${path}`);
}
