# API Contract — EXAM_OCR v2.0

> **Mục đích**: Tài liệu này liệt kê TẤT CẢ API endpoints mà Frontend sử dụng.
> Mỗi endpoint có Request/Response schema (TypeScript) + Mock data mẫu.
> Backend team dùng file này làm spec để implement API thật.

---

## Shared Types

```typescript
// types/user.ts
interface User {
  id: string;           // UUID
  email: string;
  display_name: string;
  avatar_url: string;
  role: 'teacher' | 'student';
  created_at: string;   // ISO 8601
}

// types/exam.ts
interface Exam {
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

// types/submission.ts
interface Submission {
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

// types/grade.ts
interface Grade {
  id: string;
  submission_id: string;
  question_id: string;
  ai_score: number;
  ai_reasoning: string;
  ai_confidence: number;
  teacher_override_score: number | null;
  teacher_comment: string | null;
  is_human_reviewed: boolean;
  created_at: string;
}

// types/question.ts
interface Question {
  id: string;
  teacher_id: string;
  subject: string;
  question_text: string;
  expected_answer: string | null;
  rubric_text: string;
  max_score: number;
  created_at: string;
}
```

---

## 1. Authentication

### `POST /api/auth/google`
Đăng nhập bằng Google OAuth. Frontend gửi ID Token → Backend verify → trả JWT.

**Request:**
```typescript
interface AuthGoogleRequest {
  id_token: string;  // Google ID Token
  role_hint?: 'teacher' | 'student';
}
```

**Response (200):**
```typescript
interface AuthGoogleResponse {
  access_token: string;  // JWT
  user: User;
}
```

**Mock Data:**
```json
{
  "access_token": "mock-jwt-token-abc123",
  "user": {
    "id": "usr_001",
    "email": "prof.alabaster@school.edu",
    "display_name": "Prof. Alabaster",
    "avatar_url": "https://ui-avatars.com/api/?name=Prof+Alabaster",
    "role": "teacher",
    "created_at": "2026-01-15T08:00:00Z"
  }
}
```

---

### `GET /api/auth/me`
Lấy thông tin user hiện tại từ JWT.

**Headers:** `Authorization: Bearer {jwt}`

**Response (200):** `User`

---

## 2. Dashboard

### `GET /api/dashboard/stats`
KPI tổng quan cho Teacher Dashboard.

**Response (200):**
```typescript
interface DashboardStats {
  live_submission_rate: number;     // uploads/hr
  task_priority: { urgent: number; high: number; standard: number };
  avg_score: number;
  score_trend: number;             // % change vs last period
  confidence_risk: Array<{ exam_code: string; level: 'critical' | 'medium' | 'low' }>;
}
```

**Mock Data:**
```json
{
  "live_submission_rate": 124,
  "task_priority": { "urgent": 75, "high": 15, "standard": 10 },
  "avg_score": 68.4,
  "score_trend": 4.2,
  "confidence_risk": [
    { "exam_code": "MTH-202", "level": "critical" },
    { "exam_code": "BIO-105", "level": "medium" },
    { "exam_code": "ENG-404", "level": "medium" }
  ]
}
```

---

## 3. Exams

### `GET /api/exams`
Danh sách tất cả kỳ thi của teacher hiện tại.

**Query Params:** `?status=active|closed|finalized&page=1&limit=20`

**Response (200):** `{ data: Exam[]; total: number }`

**Mock Data:**
```json
{
  "data": [
    {
      "id": "exam_001",
      "class_id": "cls_001",
      "title": "Advanced Calculus II",
      "subject": "Mathematics",
      "time_limit_minutes": 45,
      "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?data=exam_001",
      "qr_token": "MTH402-2026",
      "status": "active",
      "total_submissions": 48,
      "total_expected": 50,
      "avg_confidence": 0.982,
      "avg_score": 76.2,
      "created_at": "2026-10-24T08:00:00Z",
      "closed_at": null
    },
    {
      "id": "exam_002",
      "class_id": "cls_002",
      "title": "Introductory Physics",
      "subject": "Physics",
      "time_limit_minutes": 30,
      "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?data=exam_002",
      "qr_token": "PHY101-2026",
      "status": "active",
      "total_submissions": 12,
      "total_expected": 120,
      "avg_confidence": 0.62,
      "avg_score": 0,
      "created_at": "2026-10-22T08:00:00Z",
      "closed_at": null
    }
  ],
  "total": 2
}
```

---

### `GET /api/exams/{id}`
Chi tiết một kỳ thi + danh sách submissions.

**Response (200):**
```typescript
interface ExamDetail extends Exam {
  submissions: Submission[];
  questions: Question[];
}
```

---

### `POST /api/exams`
Tạo kỳ thi mới → Backend sinh QR Code.

**Request:**
```typescript
interface CreateExamRequest {
  class_id: string;
  title: string;
  time_limit_minutes: number;
  question_ids: string[];         // Danh sách câu hỏi từ Question Bank
  rubric_text: string;            // AI Grading Rules (ngôn ngữ tự nhiên)
}
```

**Response (201):** `Exam` (bao gồm `qr_code_url` và `qr_token` mới sinh)

---

### `PATCH /api/exams/{id}/close`
Đóng cửa nộp bài.

**Response (200):** `Exam` (với `status: 'closed'`, `closed_at` đã set)

---

### `PATCH /api/exams/{id}/finalize`
Publish điểm cho học sinh xem.

**Response (200):** `Exam` (với `status: 'finalized'`)

---

## 4. Questions (Question Bank)

### `GET /api/questions`
**Query Params:** `?subject=Mathematics&page=1&limit=50`

**Response (200):** `{ data: Question[]; total: number }`

### `POST /api/questions`
**Request:**
```typescript
interface CreateQuestionRequest {
  subject: string;
  question_text: string;
  expected_answer?: string;
  rubric_text: string;
  max_score: number;
}
```
**Response (201):** `Question`

### `PUT /api/questions/{id}`
**Request:** `Partial<CreateQuestionRequest>`
**Response (200):** `Question`

---

## 5. Submissions

### `GET /api/submit/{qr_token}`
Student quét QR → gọi endpoint này để xem thông tin kỳ thi.

**Response (200):**
```typescript
interface SubmitLandingResponse {
  exam_title: string;
  subject: string;
  time_limit_minutes: number;
  status: 'active' | 'closed';
  class_name: string;
}
```

### `POST /api/submit/{qr_token}/upload`
Student upload ảnh bài làm.

**Request:** `FormData` với field `pages: File[]` (multiple images)

**Response (201):**
```typescript
interface SubmitUploadResponse {
  submission_id: string;
  pages_received: number;
  status: 'uploaded';
  message: string;
}
```

---

## 6. Grades

### `GET /api/grades/submission/{submission_id}`
Xem điểm chi tiết của một bài nộp.

**Response (200):**
```typescript
interface SubmissionGradeDetail {
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
```

### `PATCH /api/grades/{grade_id}/override`
Teacher sửa điểm.

**Request:**
```typescript
interface GradeOverrideRequest {
  teacher_override_score: number;
  teacher_comment?: string;
}
```

**Response (200):** `Grade` (với `is_human_reviewed: true`)

---

## 7. Classes

### `POST /api/classes`
**Request:** `{ name: string; subject: string }`
**Response (201):** `{ id: string; name: string; subject: string; join_code: string }`

### `GET /api/classes`
**Response (200):** `Array<{ id: string; name: string; subject: string; join_code: string; member_count: number }>`

### `POST /api/classes/join`
**Request:** `{ join_code: string }`
**Response (200):** `{ class_id: string; message: string }`

### `GET /api/classes/{id}/members`
**Response (200):** `{ members: User[] }`

---

## 8. WebSocket

### `WS /ws/exam/{exam_id}/live`
Real-time submission counter cho QR Lobby và Dashboard.

**Message Format (Server → Client):**
```typescript
interface LiveSubmissionEvent {
  type: 'new_submission';
  student_name: string;
  submitted_at: string;
  total_submissions: number;
  total_expected: number;
}
```
