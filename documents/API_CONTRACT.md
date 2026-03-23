# 📋 EXAM_OCR v2.0 — API Contract

> **Phiên bản:** 2.0.0 | **Cập nhật:** 2026-03-22
> **Môi trường:** `http://localhost:8000` (dev) | `https://api.examocr.edu.vn` (prod)
> **Authentication:** Bearer Token (JWT) trong header `Authorization: Bearer <token>`
> **Base path:** `/api/`
> **Content-Type:** `application/json` cho tất cả request/response

---

## Mục lục

1. [Authentication](#1-authentication)
2. [Dashboard](#2-dashboard)
3. [Exams — Quản lý Đề Thi](#3-exams--quản-lý-đề-thi)
4. [Submissions — Bài Nộp](#4-submissions--bài-nộp)
5. [Grades — Chấm Điểm AI](#5-grades--chấm-điểm-ai)
6. [Questions — Ngân Hàng Câu Hỏi](#6-questions--ngân-hàng-câu-hỏi)
7. [Classes — Lớp Học](#7-classes--lớp-học)
8. [Lobby — Phòng Thi QR](#8-lobby--phòng-thi-qr)
9. [Student Submit Flow](#9-student-submit-flow)
10. [WebSocket Events](#10-websocket-events)
11. [Shared Types](#11-shared-types)
12. [Error Format](#12-error-format)

---

## 1. Authentication

### `GET /api/auth/me`
Trả thông tin người dùng hiện tại từ JWT token.

**Response:**
```json
{
  "id": "usr_001",
  "email": "nguyenvana@fpt.edu.vn",
  "display_name": "Thầy Nguyễn Văn A",
  "avatar_url": "https://...",
  "role": "teacher",
  "created_at": "2026-01-15T08:00:00Z"
}
```

### `POST /api/auth/login`
Đăng nhập bằng email + mật khẩu (hoặc OAuth Google).

**Request Body:**
```json
{
  "email": "nguyenvana@fpt.edu.vn",
  "password": "string"
}
```

**Response `200`:**
```json
{
  "access_token": "eyJhbGci...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "user": { /* UserProfile */ }
}
```

### `POST /api/auth/logout`
Thu hồi token hiện tại.

**Response `204`:** No content.

### `POST /api/auth/refresh`
Làm mới access token.

**Request Body:**
```json
{ "refresh_token": "string" }
```

---

## 2. Dashboard

### `GET /api/dashboard/stats`
Dữ liệu tổng hợp cho trang Dashboard của giáo viên.

**Response:**
```json
{
  "live_submission_rate": 87,
  "task_priority": {
    "urgent": 68,
    "high": 20,
    "standard": 12
  },
  "avg_score": 72.4,
  "score_trend": 3.8,
  "confidence_risk": [
    { "exam_code": "TOÁN-202", "level": "critical" },
    { "exam_code": "LÝ-105", "level": "medium" },
    { "exam_code": "ANH-404", "level": "medium" }
  ]
}
```

**Field notes:**
| Field | Mô tả |
|---|---|
| `live_submission_rate` | Số bài nộp / giờ trong vòng 1h gần nhất |
| `task_priority.urgent` | % bài cần xử lý gấp (trên tổng) |
| `confidence_risk.level` | `"critical"` \| `"medium"` \| `"low"` |

---

## 3. Exams — Quản lý Đề Thi

### `GET /api/exams`
Lấy danh sách đề thi của giáo viên đang đăng nhập.

**Query Params:**
| Param | Type | Mô tả |
|---|---|---|
| `status` | `active \| closed \| finalized` | Lọc theo trạng thái |
| `class_id` | `string` | Lọc theo lớp học |
| `page` | `int` (default: 1) | Phân trang |
| `page_size` | `int` (default: 20) | Số item/trang |

**Response:**
```json
{
  "data": [ /* Exam[] */ ],
  "total": 3,
  "page": 1,
  "page_size": 20
}
```

**Exam object:**
```json
{
  "id": "exam_001",
  "class_id": "cls_001",
  "title": "Kiểm tra Giữa Kỳ — Giải Tích 1",
  "subject": "Toán học",
  "time_limit_minutes": 45,
  "qr_code_url": "https://...",
  "qr_token": "TOAN402-2026",
  "status": "active",
  "total_submissions": 38,
  "total_expected": 42,
  "avg_confidence": 0.92,
  "avg_score": 74.5,
  "created_at": "2026-10-24T08:00:00Z",
  "closed_at": null
}
```

---

### `POST /api/exams`
Tạo đề thi mới.

**Request Body:**
```json
{
  "class_id": "cls_001",
  "title": "Kiểm tra Giữa Kỳ — Giải Tích 1",
  "subject": "Toán học",
  "time_limit_minutes": 45,
  "question_ids": ["q_001", "q_002", "q_003"]
}
```

**Response `201`:** Trả về `Exam` object vừa tạo, bao gồm `qr_token` và `qr_code_url` mới được sinh.

---

### `GET /api/exams/{id}`
Lấy chi tiết một đề thi kèm danh sách bài nộp.

**Response:**
```json
{
  "id": "exam_001",
  "class_id": "cls_001",
  "title": "Kiểm tra Giữa Kỳ — Giải Tích 1",
  "subject": "Toán học",
  "time_limit_minutes": 45,
  "qr_code_url": "https://...",
  "qr_token": "TOAN402-2026",
  "status": "active",
  "total_submissions": 38,
  "total_expected": 42,
  "avg_confidence": 0.92,
  "avg_score": 74.5,
  "created_at": "2026-10-24T08:00:00Z",
  "closed_at": null,
  "submissions": [ /* Submission[] - xem mục 4 */ ],
  "questions": [ /* Question[] - xem mục 6 */ ]
}
```

> ⚠️ Route `/api/exams/{id}` phải được backend routing **trước** `/api/exams` (method GET) để tránh nhầm lẫn.

---

### `PATCH /api/exams/{id}`
Cập nhật đề thi (title, status, v.v.).

**Request Body:** Bất kỳ field nào của Exam (Partial update).

### `POST /api/exams/{id}/finalize`
Kết thúc và chốt điểm toàn bộ bài nộp trong batch này.

**Response `200`:**
```json
{ "message": "Batch finalized", "finalized_at": "2026-10-25T10:00:00Z" }
```

---

## 4. Submissions — Bài Nộp

### `GET /api/submissions/{id}`
Lấy chi tiết một bài nộp cụ thể.

**Response:**
```json
{
  "id": "sub_001",
  "exam_batch_id": "exam_001",
  "student": {
    "id": "std_001",
    "display_name": "Nguyễn Thị Bảo Châu",
    "avatar_url": "https://..."
  },
  "scanned_pages": 3,
  "ocr_status": "verified",
  "ai_feedback": "Trình bày rõ ràng, áp dụng đúng quy tắc L'Hôpital.",
  "score": 88,
  "max_score": 100,
  "submitted_at": "2026-10-24T08:15:00Z"
}
```

**`ocr_status` values:**
| Giá trị | Ý nghĩa |
|---|---|
| `pending` | Đang trong hàng chờ OCR |
| `processing` | OCR đang chạy |
| `verified` | OCR thành công, AI đã chấm |
| `attention` | OCR thấp tin cậy, cần giáo viên xem lại |

---

### `POST /api/submissions`
Học sinh nộp bài qua QR. Dùng `multipart/form-data`.

**Form Fields:**
| Field | Type | Mô tả |
|---|---|---|
| `token` | `string` | QR token từ URL |
| `student_code` | `string` | Mã số sinh viên |
| `files` | `File[]` | Các ảnh trang bài làm (JPEG/PNG) |

**Response `202`:**
```json
{
  "submission_id": "sub_005",
  "status": "pending",
  "message": "Bài nộp đã được tiếp nhận. AI đang xử lý..."
}
```

---

### `PATCH /api/submissions/{id}/override`
Giáo viên can thiệp thủ công kết quả OCR.

**Request Body:**
```json
{
  "ocr_status": "verified",
  "teacher_note": "Đã xác nhận chữ viết tay — đúng"
}
```

---

## 5. Grades — Chấm Điểm AI

### `GET /api/grades/submission/{submission_id}`
Lấy toàn bộ kết quả chấm điểm AI cho một bài nộp.

**Response:**
```json
{
  "submission": { /* Submission object */ },
  "pages": [
    {
      "page_number": 1,
      "image_url": "https://...",
      "ocr_text": "Câu 1: Tính giới hạn...",
      "ocr_confidence": 0.97,
      "visualization_url": "https://..."
    }
  ],
  "grades": [
    {
      "id": "grd_001",
      "submission_id": "sub_001",
      "question_id": "q_001",
      "ai_score": 20,
      "ai_reasoning": "Sinh viên áp dụng đúng L'Hôpital, kết quả chính xác.",
      "ai_confidence": 0.97,
      "teacher_override_score": null,
      "teacher_comment": null,
      "is_human_reviewed": false,
      "created_at": "2026-10-24T08:16:00Z"
    }
  ],
  "total_score": 88,
  "max_possible_score": 100
}
```

---

### `PATCH /api/grades/{grade_id}/override`
Giáo viên chỉnh điểm / ghi chú cho từng câu hỏi.

**Request Body:**
```json
{
  "teacher_override_score": 18,
  "teacher_comment": "Thiếu hằng số tích phân C — trừ 2 điểm"
}
```

**Response `200`:** Grade object đã cập nhật.

---

## 6. Questions — Ngân Hàng Câu Hỏi

### `GET /api/questions`
Lấy danh sách câu hỏi của giáo viên.

**Query Params:**
| Param | Type | Mô tả |
|---|---|---|
| `subject` | `string` | Lọc theo môn |
| `q` | `string` | Tìm kiếm full-text |
| `page` | `int` | Phân trang |

**Response:**
```json
{
  "data": [
    {
      "id": "q_001",
      "teacher_id": "usr_001",
      "subject": "Toán học",
      "question_text": "Tính giới hạn: lim(x→0) [sin(3x) / x]",
      "expected_answer": "3",
      "rubric_text": "Đúng phương pháp L'Hôpital. Cho điểm tối đa nếu kết quả = 3.",
      "max_score": 20,
      "created_at": "2026-09-01T07:00:00Z"
    }
  ],
  "total": 3
}
```

---

### `POST /api/questions`
Tạo câu hỏi mới.

**Request Body:**
```json
{
  "subject": "Toán học",
  "question_text": "Tính giới hạn: lim(x→0) [sin(3x) / x]",
  "expected_answer": "3",
  "rubric_text": "Hướng dẫn chấm: ...",
  "max_score": 20
}
```

### `PUT /api/questions/{id}`
Cập nhật câu hỏi.

### `DELETE /api/questions/{id}`
Xóa câu hỏi (chỉ khi chưa dùng trong đề thi nào).

---

## 7. Classes — Lớp Học

### `GET /api/classes`
Lấy danh sách lớp học của giáo viên.

**Response:**
```json
[
  {
    "id": "cls_001",
    "name": "Toán Cao Cấp A1 — Nhóm 3",
    "subject": "Toán học",
    "join_code": "TOAN-A1-2026",
    "member_count": 42
  }
]
```

---

### `POST /api/classes`
Tạo lớp học mới.

**Request Body:**
```json
{
  "name": "Toán Cao Cấp A1 — Nhóm 3",
  "subject": "Toán học"
}
```

**Response `201`:** Class object kèm `join_code` tự sinh.

---

### `GET /api/classes/{id}/members`
Lấy danh sách sinh viên trong lớp.

**Response:**
```json
{
  "class": { /* Class object */ },
  "members": [
    {
      "id": "std_001",
      "display_name": "Nguyễn Thị Bảo Châu",
      "student_code": "SE160123",
      "email": "chau.ntb@student.fpt.edu.vn",
      "joined_at": "2026-08-30T08:00:00Z"
    }
  ]
}
```

---

### `POST /api/classes/{id}/members`
Thêm sinh viên vào lớp (bằng student_code hoặc email).

---

## 8. Lobby — Phòng Thi QR

### `GET /api/lobby/{exam_id}`
Trạng thái phòng thi cho màn hình giáo viên chiếu.

**Response:**
```json
{
  "exam_id": "exam_001",
  "title": "Kiểm tra Giữa Kỳ — Giải Tích 1",
  "pin": "8429",
  "status": "waiting",
  "connected_students": [
    {
      "id": "std_001",
      "display_name": "Nguyễn Thị Bảo Châu",
      "joined_at": "2026-10-24T07:58:00Z"
    }
  ]
}
```

**`status` values:** `waiting` | `active` | `closed`

---

### `POST /api/lobby/{exam_id}/start`
Giáo viên bấm "Bắt đầu thi" — chuyển trạng thái từ `waiting` → `active`.

### `POST /api/lobby/{exam_id}/close`
Kết thúc phòng thi.

---

## 9. Student Submit Flow

Đây là luồng học sinh tương tác qua **mobile web** sau khi quét QR.

---

### `GET /api/submit/{token}`
Học sinh truy cập link QR. Trả thông tin kỳ thi.

**Path Param:** `token` — QR token từ mã QR (ví dụ: `TOAN402-2026`)

**Response:**
```json
{
  "exam_title": "Kiểm tra Giữa Kỳ — Giải Tích 1",
  "subject": "Toán học",
  "time_limit_minutes": 45,
  "status": "active",
  "class_name": "Toán Cao Cấp A1 — Nhóm 3"
}
```

**Lỗi thường gặp:**
- `404`: Token không hợp lệ hoặc kỳ thi không tồn tại
- `409`: Kỳ thi đã kết thúc

---

### `POST /api/submit/{token}/upload`
Học sinh nộp ảnh bài làm. Dùng `multipart/form-data`.

**Form Fields:**
| Field | Type | Required | Mô tả |
|---|---|---|---|
| `student_code` | `string` | ✅ | Mã số sinh viên |
| `files` | `File[]` | ✅ | Ảnh trang bài làm (JPEG/PNG, max 10MB/file) |

**Response `202`:**
```json
{
  "submission_id": "sub_005",
  "confirmation_code": "OCR-9284-VX",
  "status": "pending",
  "message": "Bài nộp đã được tiếp nhận. AI đang xử lý..."
}
```

---

### `GET /api/submit/{token}/grade/{submission_id}`
Học sinh xem kết quả chấm điểm sau khi AI xử lý xong.

**Response:**
```json
{
  "exam_title": "Kiểm tra Giữa Kỳ — Giải Tích 1",
  "student_name": "Nguyễn Thị Bảo Châu",
  "total_score": 88,
  "max_score": 100,
  "grade": "B+",
  "ocr_status": "verified",
  "ai_feedback": "Trình bày rõ ràng. Mắc lỗi nhỏ ở câu 2.",
  "submitted_at": "2026-10-24T08:15:00Z",
  "graded_at": "2026-10-24T08:16:30Z"
}
```

---

## 10. WebSocket Events

**URL:** `wss://api.examocr.edu.vn/ws/lobby/{exam_id}`

### Events từ Server → Client

```jsonc
// Sinh viên mới tham gia
{ "event": "student_joined", "data": { "id": "std_005", "display_name": "Lê Văn Đức" } }

// Sinh viên nộp bài
{ "event": "submission_received", "data": { "student_id": "std_005", "submission_id": "sub_009" } }

// OCR xử lý xong
{ "event": "ocr_completed", "data": { "submission_id": "sub_009", "status": "verified", "score": 75 } }

// Trạng thái phòng thi thay đổi
{ "event": "lobby_status_changed", "data": { "status": "active" } }
```

### Events từ Client → Server

```jsonc
// Giáo viên bắt đầu thi
{ "event": "start_exam" }

// Giáo viên kết thúc
{ "event": "close_lobby" }
```

---

## 11. Shared Types

```typescript
// Người dùng
interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  role: 'teacher' | 'student' | 'admin';
  created_at: string; // ISO 8601
}

// Đề thi
interface Exam {
  id: string;
  class_id: string;
  title: string;
  subject: string;
  time_limit_minutes: number;
  qr_code_url: string;
  qr_token: string;
  status: 'active' | 'closed' | 'finalized';
  total_submissions: number;
  total_expected: number;
  avg_confidence: number; // 0.0 - 1.0
  avg_score: number | null;
  created_at: string;
  closed_at: string | null;
}

// Bài nộp
interface Submission {
  id: string;
  exam_batch_id: string;
  student: {
    id: string;
    display_name: string;
    avatar_url: string;
  };
  scanned_pages: number;
  ocr_status: 'pending' | 'processing' | 'verified' | 'attention';
  ai_feedback: string;
  score: number | null;
  max_score: number;
  submitted_at: string;
}

// Kết quả chấm từng câu
interface Grade {
  id: string;
  submission_id: string;
  question_id: string;
  ai_score: number;
  ai_reasoning: string;
  ai_confidence: number; // 0.0 - 1.0
  teacher_override_score: number | null;
  teacher_comment: string | null;
  is_human_reviewed: boolean;
  created_at: string;
}

// Câu hỏi
interface Question {
  id: string;
  teacher_id: string;
  subject: string;
  question_text: string;
  expected_answer: string;
  rubric_text: string;
  max_score: number;
  created_at: string;
}

// Lớp học
interface Class {
  id: string;
  name: string;
  subject: string;
  join_code: string;
  member_count: number;
}
```

---

## 12. Error Format

Tất cả lỗi đều trả về cấu trúc chuẩn:

```json
{
  "error": {
    "code": "SUBMISSION_NOT_FOUND",
    "message": "Không tìm thấy bài nộp với ID đã cho.",
    "details": null
  }
}
```

### HTTP Status Codes

| Code | Ý nghĩa |
|---|---|
| `200` | Thành công |
| `201` | Tạo mới thành công |
| `202` | Đã nhận, đang xử lý bất đồng bộ |
| `204` | Thành công, không có dữ liệu trả về |
| `400` | Dữ liệu đầu vào không hợp lệ |
| `401` | Chưa đăng nhập / Token hết hạn |
| `403` | Không có quyền |
| `404` | Không tìm thấy resource |
| `409` | Conflict (ví dụ: kỳ thi đã đóng) |
| `422` | Unprocessable Entity (validation chi tiết) |
| `500` | Lỗi server |

---

## 13. Ghi Chú Triển Khai Backend

### Thứ tự routing quan trọng
```
# ĐÚng ✅ — Cụ thể trước, tổng quát sau
GET /api/exams/{id}     → handler: get_exam_detail()
GET /api/exams          → handler: list_exams()

# SAI ❌ — Sẽ không bao giờ vào route cụ thể
GET /api/exams          → handler: list_exams()
GET /api/exams/{id}     → handler: get_exam_detail()
```

### File Upload cho bài nộp học sinh
- **Format:** `multipart/form-data`
- **Tối đa:** 20MB / bài nộp, 10MB / file
- **Định dạng ảnh chấp nhận:** `image/jpeg`, `image/png`, `image/webp`
- **Xử lý bất đồng bộ:** Upload xong trả `202`, OCR + AI chạy background; dùng WebSocket để thông báo hoàn thành

### CORS Headers cần thiết
```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
```

### Rate Limiting đề xuất
- `/api/submit/{token}/upload` → max 5 requests / sinh viên / phiên
- `/api/auth/login` → max 10 requests / IP / phút
