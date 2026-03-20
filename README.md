# Exam OCR Platform

Đây là phiên bản refactor theo hướng triển khai thực tế hơn của một ứng dụng OCR Streamlit dạng monolithic dùng để đọc bài thi viết tay hoặc code viết tay.

Mục tiêu chính của dự án:

- nhận ảnh bài thi hoặc ảnh code viết tay
- phát hiện các vùng text trong ảnh
- phân loại vùng text có dùng được hay bị gạch bỏ
- chạy OCR trên các vùng hợp lệ
- dựng lại text/code có cấu trúc
- hỗ trợ chấm code ở mức demo nội bộ

Phiên bản này giữ logic OCR/ML gần với bản cũ nhất có thể, nhưng tách kiến trúc thành frontend và backend rõ ràng hơn.

## 1. Tổng quan dự án

Phiên bản cũ của dự án gom tất cả vào một file Streamlit:

- giao diện
- load model
- OCR inference
- vẽ box visualize
- grading và thực thi code

Phiên bản mới tách ra thành:

- `frontend/`: Streamlit client mỏng
- `backend/`: FastAPI API và các service OCR
- `deployment/`: Docker và docker-compose
- `scripts/`: script warmup và smoke test

Mục tiêu của việc refactor:

- dễ deploy hơn
- dễ bảo trì hơn
- cấu hình bằng biến môi trường
- tách grading khỏi luồng OCR công khai
- giảm phụ thuộc vào path local hard-code

## 2. Tóm tắt pipeline OCR

Luồng OCR hiện tại như sau:

1. Người dùng upload ảnh từ frontend.
2. Frontend gửi ảnh sang backend qua HTTP.
3. Backend kiểm tra file upload.
4. YOLO phát hiện các box chứa text/dòng.
5. ResNet18 phân loại từng crop thành:
   - `clean`
   - `ambiguous`
   - `crossed`
6. Các box `crossed` sẽ bị loại khỏi bước OCR.
7. TrOCR đọc text từ các box còn lại.
8. DBSCAN gom cụm theo tọa độ trái để suy ra mức indent.
9. Backend ghép lại text/code hoàn chỉnh có thụt đầu dòng.
10. Backend trả JSON kết quả và ảnh visualization nếu có.

Ý tưởng chính:

- YOLO tìm vị trí vùng chữ
- ResNet quyết định vùng nào nên giữ
- TrOCR đọc nội dung chữ
- DBSCAN hỗ trợ dựng lại cấu trúc code

## 3. Kiến trúc hệ thống

### Frontend

Frontend nằm ở [frontend/app.py](/home/bendo/Desktop/Ben/DAT/EXAM_OCR/frontend/app.py).

Frontend chỉ làm:

- upload ảnh
- preview ảnh
- gọi API backend
- hiển thị text OCR
- hiển thị visualization backend trả về
- gọi grading endpoint nếu backend cho phép

Frontend không load model và không chạy OCR trực tiếp.

### Backend

Backend nằm ở [backend/app/main.py](/home/bendo/Desktop/Ben/DAT/EXAM_OCR/backend/app/main.py).

Backend chịu trách nhiệm:

- load model khi startup
- cung cấp API health
- cung cấp API readiness
- cung cấp API OCR prediction
- cung cấp API grading tùy chọn
- validate file upload
- điều phối pipeline OCR
- lưu file output và visualization
- logging tập trung

### Ranh giới bảo mật

Phần grading được tách khỏi luồng OCR chính.

Lưu ý quan trọng:

- grading đang tắt mặc định
- grading chỉ nên coi là internal/demo-only
- grading chưa phải sandbox thật sự
- không nên public route grading nếu chưa có cơ chế cô lập mạnh hơn

## 4. Cấu trúc thư mục hiện tại

```text
EXAM_OCR/
├── README.md
├── .env
├── .env.example
├── .gitignore
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes_health.py
│   │   │   ├── routes_ocr.py
│   │   │   └── routes_grade.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── logger.py
│   │   │   └── model_registry.py
│   │   ├── schemas/
│   │   │   ├── grade_response.py
│   │   │   └── ocr_response.py
│   │   ├── services/
│   │   │   ├── classification.py
│   │   │   ├── detection.py
│   │   │   ├── file_manager.py
│   │   │   ├── formatting.py
│   │   │   ├── grading.py
│   │   │   ├── ocr_pipeline.py
│   │   │   └── recognition.py
│   │   ├── utils/
│   │   │   ├── image_utils.py
│   │   │   └── security.py
│   │   └── main.py
│   ├── models/
│   │   ├── YOLO/
│   │   ├── Resnet/
│   │   └── trocr_handwritten_decoder_only_best_S1/
│   ├── runtime/
│   │   ├── uploads/
│   │   └── outputs/
│   └── requirements.txt
├── frontend/
│   ├── app.py
│   └── requirements.txt
├── deployment/
│   ├── docker/
│   │   ├── Dockerfile.backend
│   │   ├── Dockerfile.frontend
│   │   └── nginx.conf
│   └── docker-compose.yml
└── scripts/
    ├── smoke_test.py
    └── warmup.py
```

## 5. Vai trò các file quan trọng

### Backend core

- [backend/app/core/config.py](/home/bendo/Desktop/Ben/DAT/EXAM_OCR/backend/app/core/config.py)  
  Đọc biến môi trường từ `.env` và cung cấp giá trị mặc định.

- [backend/app/core/model_registry.py](/home/bendo/Desktop/Ben/DAT/EXAM_OCR/backend/app/core/model_registry.py)  
  Load YOLO, TrOCR và ResNet một lần khi backend khởi động.

- [backend/app/core/logger.py](/home/bendo/Desktop/Ben/DAT/EXAM_OCR/backend/app/core/logger.py)  
  Cấu hình logging tập trung.

### Backend OCR services

- [backend/app/services/detection.py](/home/bendo/Desktop/Ben/DAT/EXAM_OCR/backend/app/services/detection.py)  
  Logic detect bằng YOLO.

- [backend/app/services/classification.py](/home/bendo/Desktop/Ben/DAT/EXAM_OCR/backend/app/services/classification.py)  
  Logic phân loại crop bằng ResNet18.

- [backend/app/services/recognition.py](/home/bendo/Desktop/Ben/DAT/EXAM_OCR/backend/app/services/recognition.py)  
  Logic pad crop, OCR bằng TrOCR và tính indent bằng DBSCAN.

- [backend/app/services/formatting.py](/home/bendo/Desktop/Ben/DAT/EXAM_OCR/backend/app/services/formatting.py)  
  Ghép lại text/code hoàn chỉnh và vẽ visualization box.

- [backend/app/services/ocr_pipeline.py](/home/bendo/Desktop/Ben/DAT/EXAM_OCR/backend/app/services/ocr_pipeline.py)  
  Điều phối toàn bộ pipeline OCR.

- [backend/app/services/file_manager.py](/home/bendo/Desktop/Ben/DAT/EXAM_OCR/backend/app/services/file_manager.py)  
  Kiểm tra file upload và ghi file output.

- [backend/app/services/grading.py](/home/bendo/Desktop/Ben/DAT/EXAM_OCR/backend/app/services/grading.py)  
  Logic grading demo nội bộ.

### Backend API

- [backend/app/api/routes_health.py](/home/bendo/Desktop/Ben/DAT/EXAM_OCR/backend/app/api/routes_health.py)  
  Endpoint health và ready.

- [backend/app/api/routes_ocr.py](/home/bendo/Desktop/Ben/DAT/EXAM_OCR/backend/app/api/routes_ocr.py)  
  Endpoint OCR prediction.

- [backend/app/api/routes_grade.py](/home/bendo/Desktop/Ben/DAT/EXAM_OCR/backend/app/api/routes_grade.py)  
  Endpoint grading nội bộ.

### Frontend

- [frontend/app.py](/home/bendo/Desktop/Ben/DAT/EXAM_OCR/frontend/app.py)  
  Streamlit client gọi backend.

### Deployment

- [deployment/docker-compose.yml](/home/bendo/Desktop/Ben/DAT/EXAM_OCR/deployment/docker-compose.yml)  
  Chạy frontend, backend và nginx.

- [deployment/docker/Dockerfile.backend](/home/bendo/Desktop/Ben/DAT/EXAM_OCR/deployment/docker/Dockerfile.backend)  
  Docker image cho backend.

- [deployment/docker/Dockerfile.frontend](/home/bendo/Desktop/Ben/DAT/EXAM_OCR/deployment/docker/Dockerfile.frontend)  
  Docker image cho frontend.

## 6. API endpoints

### `GET /health`

Endpoint kiểm tra service còn sống hay không.

Trả về:

- trạng thái service
- version

### `GET /ready`

Endpoint kiểm tra backend đã sẵn sàng xử lý chưa.

Trả về:

- model đã load chưa
- device đang dùng
- grading có bật không
- lỗi load model nếu có

### `POST /api/ocr/predict`

Nhận ảnh upload và trả về:

- `success`
- `filename`
- `recognized_text`
- `boxes`
- `processing_time`
- `visualization_path`
- `request_id`
- `error`

### `POST /api/grade/run`

Endpoint grading tùy chọn.

Lưu ý:

- đang tắt mặc định
- chỉ nên dùng nội bộ
- chưa an toàn để public

## 7. Cấu hình bằng `.env`

Backend đọc config từ:

- [`.env`](/home/bendo/Desktop/Ben/DAT/EXAM_OCR/.env)

Code đọc `.env` nằm ở:

- [backend/app/core/config.py](/home/bendo/Desktop/Ben/DAT/EXAM_OCR/backend/app/core/config.py)

Nguyên tắc:

- giá trị trong `Settings` là giá trị mặc định
- giá trị trong `.env` sẽ override giá trị mặc định đó

Biến môi trường quan trọng:

- `YOLO_MODEL_PATH`
- `RESNET_MODEL_PATH`
- `TROCR_MODEL_PATH`
- `DEVICE`
- `MAX_UPLOAD_MB`
- `ENABLE_GRADING`
- `LOG_LEVEL`

## 8. Chiến lược tổ chức model

### Cấu trúc model local khuyến nghị

Nên giữ model ở cấu trúc sau:

```text
EXAM_OCR/
└── backend/
    └── models/
        ├── YOLO/
        │   └── best_phase2_143.pt
        ├── Resnet/
        │   └── resnet18_text_cls.pth
        └── trocr_handwritten_decoder_only_best_S1/
            ├── config.json
            ├── generation_config.json
            ├── preprocessor_config.json
            ├── tokenizer files
            └── model weight files
```

Lý do:

- path ổn định
- backend dễ tìm model
- ít nhầm lẫn giữa local và Docker
- repo dễ quản lý hơn

### `.env` chuẩn khi chạy local

```env
YOLO_MODEL_PATH=backend/models/YOLO/best_phase2_143.pt
RESNET_MODEL_PATH=backend/models/Resnet/resnet18_text_cls.pth
TROCR_MODEL_PATH=backend/models/trocr_handwritten_decoder_only_best_S1
```

Đây là cấu hình local tiêu chuẩn nếu model nằm trong project.

## 9. Kế hoạch để model trên Google Drive

Bạn có nói rằng folder model sẽ được upload lên Drive sau này. Đây là cách làm hợp lý vì model thường nặng và không nên đưa vào Git.

Khuyến nghị:

### Trong repository Git

Chỉ nên giữ:

- source code
- Docker files
- `.env.example`
- scripts
- README

Không nên giữ:

- model weights lớn
- file upload tạm
- file output sinh ra

### Trên Google Drive

Nên upload theo cấu trúc:

```text
models/
├── YOLO/
│   └── best_phase2_143.pt
├── Resnet/
│   └── resnet18_text_cls.pth
└── trocr_handwritten_decoder_only_best_S1/
    └── ...
```

Sau khi tải hoặc sync từ Drive về, đặt lại vào:

```text
EXAM_OCR/backend/models/
```

Như vậy project sẽ chạy lại mà không cần đổi code.

### Cách setup chuẩn

Workflow nên là:

1. Clone repo code về máy.
2. Tải model từ Google Drive. Link: https://drive.google.com/file/d/19j3cDWgtMi67V5e9WAexe4pKAXuD7PNa/view?usp=sharing
3. Khôi phục folder model vào `backend/models/`.
4. Giữ `.env` theo chuẩn local:

```env
YOLO_MODEL_PATH=backend/models/YOLO/best_phase2_143.pt
RESNET_MODEL_PATH=backend/models/Resnet/resnet18_text_cls.pth
TROCR_MODEL_PATH=backend/models/trocr_handwritten_decoder_only_best_S1
```

5. Chạy backend và frontend như bình thường.

Đây là cách sạch nhất cho một dự án sinh viên có model nặng nhưng vẫn cần tái lập môi trường dễ dàng.

## 10. Chính sách `.gitignore` nên dùng

Nên ignore:

- `backend/models/`
- `backend/runtime/`
- `.env`
- virtualenv
- file cache Python

Nếu muốn giữ cấu trúc thư mục trống trong Git, có thể:

- ignore file weight
- giữ `.gitkeep`
- mô tả tên model cần có trong README này

## 11. Cách chạy local

### Chạy backend

```bash
cd /home/bendo/Desktop/Ben/DAT/EXAM_OCR/backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Chạy frontend

Mở terminal khác:

```bash
cd /home/bendo/Desktop/Ben/DAT/EXAM_OCR/frontend
streamlit run app.py --server.port 8501
```

Mở trình duyệt:

- frontend: `http://localhost:8501`
- backend health: `http://localhost:8000/health`
- backend ready: `http://localhost:8000/ready`

## 12. Cách chạy bằng Docker

Từ thư mục:

```bash
cd /home/bendo/Desktop/Ben/DAT/EXAM_OCR/deployment
```

Chạy:

```bash
cp ../.env.example .env
docker compose up --build
```

Lưu ý:

Khi chạy Docker, path model trong container khác với path local. Khi đó:

- `*_HOST` là path model phía máy host
- `*_PATH` là path model phía trong container

Nếu muốn Docker dùng đúng `backend/models/`, hãy chỉnh mount trong compose cho đồng nhất với cấu trúc này.

## 13. Rủi ro và giới hạn hiện tại

### Grading

Grading chưa an toàn cho production.

Lý do:

- vẫn liên quan tới thực thi code
- chưa có sandbox thật
- chỉ nên dùng nội bộ hoặc demo

### OCR

Pipeline OCR đã được giữ gần bản gốc, nhưng nếu muốn triển khai thực tế hơn vẫn có thể cần:

- error handling mạnh hơn
- cleanup strategy tốt hơn cho file runtime
- request tracing tốt hơn
- kiểm soát tài nguyên inference tốt hơn

## 14. Tóm tắt migration

Những gì đã thay đổi so với app Streamlit monolithic:

- Streamlit trở thành frontend-only
- FastAPI trở thành backend inference layer
- model loading được đưa vào backend startup
- OCR logic được tách thành service modules
- hard-coded path được chuyển sang env-based config
- grading được tách riêng và tắt mặc định
- thêm Docker files để dễ deploy

Những gì vẫn giữ nguyên về mặt logic:

- detect bằng YOLO
- classify crop bằng ResNet
- OCR bằng TrOCR
- dựng indent
- ý tưởng grading tùy chọn

## 15. Thiết lập chuẩn được khuyến nghị về sau

Để dự án gọn và dễ dùng lâu dài, nên theo workflow này:

1. Git chỉ giữ code.
2. Google Drive giữ model weights.
3. Sau khi clone repo, restore model vào `backend/models/`.
4. Giữ `.env` theo path local tương đối:

```env
YOLO_MODEL_PATH=backend/models/YOLO/best_phase2_143.pt
RESNET_MODEL_PATH=backend/models/Resnet/resnet18_text_cls.pth
TROCR_MODEL_PATH=backend/models/trocr_handwritten_decoder_only_best_S1
```

5. Chạy backend local hoặc Docker tùy môi trường.

Lợi ích của cách này:

- dễ tái lập project
- dễ onboarding người khác
- ít lỗi path
- dễ quản lý source code và model tách biệt
