# PRD v2.0 — EXAM OCR: AI Auto-Grading Platform

**Version**: 2.0  
**Last Updated**: 2026-03-22  
**Status**: Draft — Awaiting Review

---

## 1. Tổng quan dự án (Executive Summary)

### 1.1 Tầm nhìn
Nâng cấp hệ thống EXAM OCR từ một công cụ OCR đơn lẻ (v1.0) thành một **nền tảng SaaS giáo dục hoàn chỉnh** phục vụ Giáo viên và Học sinh. Hệ thống cho phép:
- Giáo viên tạo đề thi, sinh mã QR, theo dõi tiến độ chấm bài real-time.
- Học sinh quét QR để nộp bài viết tay qua điện thoại.
- AI tự động nhận diện chữ viết tay (OCR) và chấm điểm bằng LLM Agent dựa trên Rubric.

### 1.2 Hiện trạng v1.0 (What We Have)
Codebase hiện tại là một ứng dụng **Streamlit (Frontend) + FastAPI (Backend)** dạng monolithic refactored, chỉ hỗ trợ:
- Upload ảnh thủ công qua giao diện Streamlit
- Pipeline OCR tuần tự đồng bộ (YOLO → ResNet18 → TrOCR → DBSCAN)
- Grading demo bằng `exec()` (không sandbox, tắt mặc định)
- Không có khái niệm User, Class, Exam, hay Database
- Không có hàng đợi (Queue) hay xử lý bất đồng bộ

### 1.3 Mục tiêu v2.0 (What We Need)
| Hạng mục | v1.0 | v2.0 |
|---|---|---|
| Frontend | Streamlit (Desktop only) | Next.js/React (Desktop + Mobile responsive) |
| Authentication | Không có | Google SSO (OAuth 2.0) |
| User Roles | Không có | Teacher, Student |
| Exam Management | Không có | Question Bank, Exam Builder, QR Code Generator |
| Submission | Upload thủ công 1 file | Học sinh quét QR, chụp ảnh qua Camera WebApp |
| Grading | `exec()` demo | LLM Agent (GPT-4o/Gemini) + Rubric Rules |
| Processing | Đồng bộ (Sync) | Bất đồng bộ (Async Queue: Celery + Redis) |
| Database | Không có | PostgreSQL (Users, Classes, Exams, Submissions, Grades) |
| Dashboard | Không có | Teacher Mission Control + Student Grade Portal |
| Real-time | Không có | WebSocket (Live submission counter, status updates) |

---

## 2. Chân dung Người dùng (User Personas)

### 2.1 Giáo viên (Teacher)
- **Vai trò**: Quản lý lớp học, soạn đề thi, theo dõi tiến độ chấm bài, duyệt điểm.
- **Thiết bị**: Desktop (Laptop/PC) là chính.
- **Pain Point hiện tại**: Phải chụp ảnh hàng loạt bài giấy rồi upload thủ công vào Streamlit.

### 2.2 Học sinh (Student)
- **Vai trò**: Nộp bài thi viết tay qua điện thoại, xem điểm và lời phê.
- **Thiết bị**: Điện thoại di động (Mobile) là chính.
- **Pain Point hiện tại**: Hoàn toàn không có quyền truy cập vào hệ thống v1.0.

---

## 3. Kiến trúc Hệ thống v2.0 (System Architecture)

### 3.1 Tổng quan Stack

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Teacher App  │  │ Student App  │  │ QR Lobby View │  │
│  │ (Desktop)    │  │ (Mobile)     │  │ (Projector)   │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
└───────────────────────────┬─────────────────────────────┘
                            │ REST API + WebSocket
┌───────────────────────────▼─────────────────────────────┐
│                    BACKEND (FastAPI)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Auth API │  │ Exam API │  │ OCR API  │  │Grade API│ │
│  │ (OAuth)  │  │ (CRUD)   │  │ (v1 giữ) │  │(LLM)   │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
└──────────┬──────────────┬───────────────────────────────┘
           │              │
┌──────────▼──────┐  ┌────▼─────────────────────────────┐
│  PostgreSQL DB  │  │  Celery Workers + Redis Queue    │
│  (Data Store)   │  │  (Async OCR + LLM Processing)   │
└─────────────────┘  └─────────────────────────────────┘
```

### 3.2 Mapping: Code Hiện tại → Vai trò mới trong v2.0

| File v1.0 | Vai trò trong v2.0 | Hành động |
|---|---|---|
| `backend/app/main.py` | Vẫn là entry point FastAPI | **Mở rộng**: Thêm routers mới (auth, exam, submission) |
| `backend/app/core/config.py` | Config tập trung | **Mở rộng**: Thêm `DATABASE_URL`, `REDIS_URL`, `GOOGLE_CLIENT_ID`, `LLM_API_KEY` |
| `backend/app/core/model_registry.py` | Load YOLO/ResNet/TrOCR | **Giữ nguyên**: Logic load model không thay đổi |
| `backend/app/services/detection.py` | YOLO detect boxes | **Giữ nguyên** |
| `backend/app/services/classification.py` | ResNet classify crops | **Giữ nguyên** |
| `backend/app/services/recognition.py` | TrOCR OCR + DBSCAN indent | **Giữ nguyên** |
| `backend/app/services/formatting.py` | Build text + visualization | **Giữ nguyên** |
| `backend/app/services/ocr_pipeline.py` | Orchestrate OCR pipeline | **Refactor**: Gọi từ Celery Worker thay vì gọi đồng bộ |
| `backend/app/services/grading.py` | `exec()` code demo | **THAY THẾ HOÀN TOÀN**: Đổi sang LLM Agent + Rubric |
| `backend/app/services/file_manager.py` | Validate & write files | **Mở rộng**: Ghi vào Cloud Storage thay vì local disk |
| `backend/app/api/routes_ocr.py` | `/api/ocr/predict` | **Refactor**: Đẩy task vào Queue thay vì chạy sync |
| `backend/app/api/routes_grade.py` | `/api/grade/run` | **THAY THẾ**: Endpoint gọi LLM Agent |
| `backend/app/api/routes_health.py` | `/health`, `/ready` | **Giữ nguyên** |
| `backend/app/schemas/` | Pydantic response models | **Mở rộng**: Thêm schemas cho User, Exam, Submission, Grade |
| `backend/app/utils/security.py` | Internal token check | **THAY THẾ**: OAuth 2.0 + JWT middleware |
| `frontend/app.py` | Streamlit client | **THAY THẾ HOÀN TOÀN**: Xây lại bằng Next.js |

---

## 4. Database Schema (Lược đồ Cơ sở Dữ liệu)

### 4.1 Entity Relationship (ER)

```
Users ──< ClassMembers >── Classes
                              │
                          Exam_Batches ──< Questions (from QuestionBank)
                              │
                          Submissions ──< Submission_Pages
                              │
                            Grades
```

### 4.2 Chi tiết các Bảng

#### `users`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| email | VARCHAR UNIQUE | Google email |
| display_name | VARCHAR | |
| avatar_url | VARCHAR | Google avatar |
| role | ENUM('teacher','student') | Chốt đơn giản: mỗi user chỉ có 1 role cố định |
| google_sub | VARCHAR UNIQUE | Google OAuth subject ID |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `classes`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| name | VARCHAR | VD: "Lớp 10A1" |
| subject | VARCHAR | VD: "Lập trình Python" |
| join_code | VARCHAR(6) UNIQUE | Mã tham gia lớp (auto-gen) |
| teacher_id | UUID (FK → users) | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `class_members`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| class_id | UUID (FK → classes) | |
| student_id | UUID (FK → users) | |
| status | ENUM('active','left','removed') | Giữ lịch sử thành viên lớp |
| joined_at | TIMESTAMP | |
| left_at | TIMESTAMP NULL | |

**Constraints:**
- `UNIQUE(class_id, student_id)`

#### `question_bank`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| teacher_id | UUID (FK → users) | |
| subject | VARCHAR | Tag phân loại |
| question_text | TEXT | Nội dung đề bài |
| expected_answer | TEXT | Đáp án mẫu (tuỳ chọn) |
| rubric_json | JSONB | Bảng tiêu chí chấm điểm có cấu trúc |
| rubric_text | TEXT | Rule ngôn ngữ tự nhiên để gửi cho LLM |
| max_score | NUMERIC(5,2) | Điểm tối đa |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `exam_batches`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| class_id | UUID (FK → classes) | |
| teacher_id | UUID (FK → users) | Denormalize có chủ đích để query/audit/phân quyền dễ hơn |
| title | VARCHAR | VD: "Kiểm tra 15p - Tuần 5" |
| time_limit_minutes | INT | |
| qr_code_url | VARCHAR | URL mã QR sinh ra |
| qr_token | VARCHAR UNIQUE | Token ngắn nhúng trong QR |
| status | ENUM('draft','active','closed','finalized') | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |
| closed_at | TIMESTAMP NULL | |
| finalized_at | TIMESTAMP NULL | |

#### `exam_questions`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| exam_batch_id | UUID (FK → exam_batches) | |
| question_id | UUID (FK → question_bank) | |
| order_index | INT | Thứ tự câu hỏi trong đề |
| prompt_snapshot | TEXT | Snapshot nội dung câu hỏi tại thời điểm publish exam |
| rubric_snapshot | TEXT | Snapshot rubric dùng để chấm kỳ thi này |
| max_score_snapshot | NUMERIC(5,2) | Snapshot điểm tối đa |

**Constraints:**
- `UNIQUE(exam_batch_id, order_index)`

#### `submissions`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| exam_batch_id | UUID (FK → exam_batches) | |
| student_id | UUID (FK → users) | |
| status | ENUM('uploaded','ocr_processing','ocr_done','grading','needs_review','graded') | |
| attempt_no | INT DEFAULT 1 | Chốt hiện tại: hệ thống ưu tiên 1 bài nộp / học sinh / kỳ thi |
| submitted_at | TIMESTAMP | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**Constraints:**
- `UNIQUE(exam_batch_id, student_id)`

#### `submission_pages`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| submission_id | UUID (FK → submissions) | |
| page_number | INT | |
| image_url | VARCHAR | URL ảnh trên Cloud Storage |
| ocr_text | TEXT | Text trích xuất bởi TrOCR |
| ocr_confidence | NUMERIC(5,4) | Độ tự tin trung bình của OCR |
| visualization_url | VARCHAR | URL ảnh vẽ bounding boxes |
| created_at | TIMESTAMP | |

**Constraints:**
- `UNIQUE(submission_id, page_number)`

#### `submission_answers`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| submission_id | UUID (FK → submissions) | |
| exam_question_id | UUID (FK → exam_questions) | |
| aggregated_text | TEXT | Nội dung OCR đã gom theo từng câu |
| ai_confidence | NUMERIC(5,4) | Độ tự tin của bước tách câu/trích câu trả lời |
| needs_review | BOOLEAN DEFAULT FALSE | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**Mục đích:** nối lớp dữ liệu giữa `submission_pages` và `grades`, để resolution desk biết AI đang chấm phần nào của bài làm.

#### `grades`
| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| submission_id | UUID (FK → submissions) | |
| exam_question_id | UUID (FK → exam_questions) | Chấm theo câu hỏi đã được snapshot vào exam |
| submission_answer_id | UUID (FK → submission_answers) | |
| ai_score | NUMERIC(5,2) | Điểm LLM Agent đề xuất |
| ai_reasoning | TEXT | Lý do chấm điểm của AI |
| ai_confidence | NUMERIC(5,4) | Độ tự tin của Agent |
| teacher_override_score | NUMERIC(5,2) | Giáo viên sửa lại (nếu có) |
| teacher_comment | TEXT | Lời phê bổ sung |
| is_human_reviewed | BOOLEAN DEFAULT FALSE | |
| reviewed_by | UUID (FK → users) NULL | Giáo viên đã duyệt/sửa |
| reviewed_at | TIMESTAMP NULL | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**Constraints:**
- `UNIQUE(submission_id, exam_question_id)`

---

## 5. API Endpoints v2.0

### 5.1 Giữ nguyên từ v1.0
| Method | Path | Mô tả |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/ready` | Readiness check (models loaded?) |

### 5.2 Authentication (MỚI)
| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/auth/google` | Nhận Google ID Token → trả JWT |
| GET | `/api/auth/me` | Lấy thông tin user hiện tại |

### 5.3 Class Management (MỚI)
| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/classes` | Tạo lớp học mới (Teacher only) |
| GET | `/api/classes` | Danh sách lớp của teacher/student |
| POST | `/api/classes/join` | Tham gia lớp bằng join_code (Student) |
| GET | `/api/classes/{id}/members` | Danh sách thành viên lớp |

### 5.4 Question Bank (MỚI)
| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/questions` | Tạo câu hỏi mới + rubric |
| GET | `/api/questions` | Liệt kê câu hỏi (filtered by subject) |
| PUT | `/api/questions/{id}` | Sửa câu hỏi |

### 5.5 Exam Management (MỚI)
| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/exams` | Tạo kỳ thi mới → sinh QR Code |
| GET | `/api/exams` | Danh sách kỳ thi (Teacher Dashboard) |
| GET | `/api/exams/{id}` | Chi tiết kỳ thi + danh sách submissions |
| PATCH | `/api/exams/{id}/close` | Đóng cửa nộp bài |
| PATCH | `/api/exams/{id}/finalize` | Publish điểm cho học sinh |

### 5.6 Submission (MỚI — Thay thế OCR Route cũ)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/submit/{qr_token}` | Validate QR token → trả exam info |
| POST | `/api/submit/{qr_token}/upload` | Student upload ảnh bài làm |

### 5.7 Grading (THAY THẾ v1.0)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/grades/submission/{id}` | Xem điểm chi tiết |
| PATCH | `/api/grades/{id}/override` | Teacher sửa điểm (Override) |

### 5.8 Dashboard Analytics (MỚI)
| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/dashboard/stats` | KPIs cho Teacher Dashboard |
| WS | `/ws/exam/{id}/live` | WebSocket: Live submission counter |

---

## 6. Luồng xử lý bất đồng bộ (Async Pipeline)

### 6.1 Celery Task Chain

```
Event: Student uploads image
    │
    ▼
Task 1: validate_and_store_image
    → Kiểm tra blur (OpenCV Laplacian)
    → Upload lên Cloud Storage
    → Cập nhật submission_pages.image_url
    │
    ▼
Task 2: run_ocr_pipeline (GIỮ NGUYÊN LOGIC V1.0)
    → YOLO detect_boxes()
    → ResNet classify_crops()
    → TrOCR ocr_crops()
    → DBSCAN compute_indent_levels()
    → format_text() + draw_visualization()
    → Cập nhật submission_pages.ocr_text, ocr_confidence
    │
    ▼
Task 3: run_llm_grading (MỚI)
    → Đóng gói: ocr_text + rubric_text + question_text
    → Gọi LLM API (Structured Output JSON)
    → Parse response → Ghi vào grades table
    → Nếu ai_confidence < 0.7 → đánh dấu needs_review
    │
    ▼
Task 4: notify_completion
    → Bắn WebSocket event tới Teacher Dashboard
    → Cập nhật submission.status = 'graded' / 'needs_review'
```

### 6.2 LLM Agent Prompt Template (Grading)

```
You are an exam grading assistant. Grade the following student answer.

**Question:** {question_text}

**Student's Handwritten Answer (OCR Extracted):**
{ocr_text}

**Grading Rules & Rubric:**
{rubric_text}

**Maximum Score:** {max_score}

Respond ONLY with this JSON format:
{
  "score": <float>,
  "reasoning": "<detailed Vietnamese explanation of why this score was given>",
  "confidence": <float between 0 and 1>,
  "deductions": [
    {"criterion": "<name>", "points_lost": <float>, "reason": "<why>"}
  ]
}
```

---

## 7. Đặc tả Màn hình (Screen Specifications)

> **Reference Visuals**: `EXAM_OCR/UI screen design/stitch_clinical_enterprise_prd/`

### 7.1 Teacher Screens (Desktop Web)

| # | Tên Màn hình | File tham chiếu | Chức năng chính |
|---|---|---|---|
| T1 | **Dashboard** | `updated_dashboard_live_submission_rate/` | 4 Widget KPIs (Live Submission Rate, Task Priority, Score Distribution, Confidence Risk) + Bảng danh sách Exam Batches (Tabs: Open/Completed) |
| T2 | **Batch Details** | `updated_batch_details_ai_feedback/` | Danh sách submissions của một kỳ thi. Cột: Student ID, Scanned Pages, OCR Status, AI Feedback/Reason, Score, Actions |
| T3 | **Exam Configurator** | `updated_exam_builder_tactile/` | Form tạo kỳ thi: Subject, Date, Time Limit, Chọn câu hỏi từ Question Bank, Nhập AI Rubric → Nút Generate QR Code |
| T4 | **Resolution Desk** | `updated_resolution_desk_ai_evaluation/` | Chia đôi: Ảnh gốc (trái) + AI Interpretation + AI Grading Agent Evaluation (phải, có Adjust Score slider) |
| T5 | **QR Lobby** | `exam_qr_lobby/` | QR Code to, đếm số học sinh đã nộp real-time, danh sách tên HS pop-up |
| T6 | **Question Bank** | *(Cần thiết kế mới)* | CRUD câu hỏi + gõ Rubric |
| T7 | **Class Management** | *(Cần thiết kế mới)* | Tạo lớp, xem danh sách HS, sinh Join Code |

### 7.2 Student Screens (Mobile Web)

| # | Tên Màn hình | Chức năng chính |
|---|---|---|
| S1 | **QR Landing** | Splash: "Kiểm tra Toán 15p - Lớp 10A1". Nút Sign in with Google |
| S2 | **Camera Capture** | Giao diện Camera mở toàn màn hình. Overlay khung viền. Nút Chụp + Preview |
| S3 | **Upload Confirmation** | Thumbnail ảnh vừa chụp + nút "Nộp bài" + nút "Chụp lại" |
| S4 | **Success** | Thông báo "Nộp bài thành công!" + Animation checkmark |
| S5 | **Grade Portal** | Xem điểm từng bài: Ảnh gốc có bounding boxes + Lời phê AI + Điểm số |

---

## 8. Phân chia Giai đoạn Triển khai (Phased Rollout)

### Phase 1: Foundation (Tuần 1-2)
- [ ] Setup Next.js project (Frontend mới)
- [ ] Setup PostgreSQL + Alembic migrations
- [ ] Implement Google OAuth 2.0 (Auth API)
- [ ] Implement User, Class CRUD APIs
- [ ] Build Teacher Dashboard UI (tĩnh, mock data)

### Phase 2: Exam Builder & QR (Tuần 3-4)
- [ ] Implement Question Bank CRUD
- [ ] Implement Exam Configurator + QR Code generation (qrcode lib)
- [ ] Build QR Lobby screen + WebSocket live counter
- [ ] Build Student mobile submission flow (Camera WebApp)

### Phase 3: AI Pipeline Integration (Tuần 5-6)
- [ ] Setup Celery + Redis
- [ ] Refactor `ocr_pipeline.py` thành Celery Task
- [ ] Implement LLM Grading Agent service (thay thế `grading.py`)
- [ ] Build Resolution Desk UI cho Teacher
- [ ] Build Grade Portal UI cho Student

### Phase 4: Polish & Deploy (Tuần 7-8)
- [ ] Real-time WebSocket notifications
- [ ] Export CSV điểm số
- [ ] Docker Compose v2 (Next.js + FastAPI + PostgreSQL + Redis + Celery)
- [ ] Testing end-to-end
- [ ] Deploy lên Cloud (GCP/AWS)

---

## 9. Rủi ro & Giải pháp (Risks & Mitigations)

| Rủi ro | Mức độ | Giải pháp |
|---|---|---|
| LLM API tốn chi phí cao khi chấm hàng loạt | Cao | Cache kết quả, batch gọi API, dùng model rẻ hơn (Gemini Flash) cho bài đơn giản |
| Ảnh chụp từ điện thoại quá mờ | Trung bình | Blur Detection (Laplacian) ngay trên client trước khi upload |
| OCR đọc sai chữ viết tay xấu | Cao | Đã có trạng thái `needs_review` + Teacher Override |
| Quá tải khi 200 HS nộp cùng lúc | Trung bình | Celery Workers scale horizontal, Redis Queue đệm |
| Bảo mật Google SSO | Thấp | Verify ID Token server-side, HTTPS only |

---

## 10. Quy ước Kỹ thuật (Technical Conventions)

### 10.1 Cấu trúc Thư mục v2.0 Dự kiến

```
EXAM_OCR/
├── frontend/                    # Next.js App (MỚI HOÀN TOÀN)
│   ├── src/
│   │   ├── app/                 # App Router (pages)
│   │   ├── components/          # Reusable UI components
│   │   ├── lib/                 # API clients, utils
│   │   └── styles/              # Global CSS
│   └── package.json
├── backend/                     # FastAPI (MỞ RỘNG)
│   ├── app/
│   │   ├── api/                 # Routes (giữ cũ + thêm mới)
│   │   ├── core/                # Config, Logger, ModelRegistry (giữ cũ)
│   │   ├── db/                  # (MỚI) SQLAlchemy models + migrations
│   │   ├── schemas/             # Pydantic models (mở rộng)
│   │   ├── services/            # OCR pipeline (giữ) + LLM grading (mới)
│   │   ├── tasks/               # (MỚI) Celery task definitions
│   │   └── utils/               # Security (refactor OAuth)
│   ├── models/                  # AI model weights (YOLO, ResNet, TrOCR)
│   ├── migrations/              # (MỚI) Alembic migrations
│   └── requirements.txt
├── deployment/
│   ├── docker/
│   └── docker-compose.yml       # Cập nhật: thêm postgres, redis, celery
├── scripts/
├── UI screen design/            # Stitch exports (reference)
├── PRD_v2.md                    # << BẠN ĐANG ĐỌC FILE NÀY
├── .env
└── README.md
```

### 10.2 Environment Variables mới (.env)

```env
# === V1.0 (GIỮ NGUYÊN) ===
YOLO_MODEL_PATH=backend/models/YOLO/best_phase2_143.pt
RESNET_MODEL_PATH=backend/models/Resnet/resnet18_text_cls.pth
TROCR_MODEL_PATH=backend/models/trocr_handwritten_decoder_only_best_S1
DEVICE=auto

# === V2.0 (MỚI) ===
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/exam_ocr
REDIS_URL=redis://localhost:6379/0
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-secret
JWT_SECRET_KEY=your-jwt-secret-256-bit
LLM_PROVIDER=gemini          # hoặc openai
LLM_API_KEY=your-llm-api-key
LLM_MODEL=gemini-2.0-flash   # hoặc gpt-4o
OCR_CONFIDENCE_THRESHOLD=0.7
```
