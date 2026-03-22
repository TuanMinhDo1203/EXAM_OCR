# Toàn cảnh User Flow: Hệ thống Chấm bài tự động EXAM OCR

Dưới đây là sơ đồ luồng người dùng (Userflow) chi tiết, thể hiện sự tương tác giữa Giáo viên, Học sinh và Hệ thống AI chấm điểm nền tảng (Backend).

```mermaid
flowchart TD
    classDef teacher fill:#3B82F6,stroke:#1E3A8A,stroke-width:2px,color:#fff
    classDef student fill:#F97316,stroke:#9A3412,stroke-width:2px,color:#fff
    classDef system fill:#F3F4F6,stroke:#4B5563,stroke-width:2px,color:#111
    classDef ai fill:#10B981,stroke:#065F46,stroke-width:2px,color:#fff

    subgraph Teacher["Giáo Viên Journey"]
        T1([Đăng nhập Web Desktop]) --> T2[Tạo Lô Kỳ thi mới]
        T2 --> T3[Soạn Câu hỏi và Nhập Rubric]
        T3 --> T4[Bấm Phát hành kì thi]
        T4 --> T5[[Hệ thống chiếu Mã QR lên Bảng]]
        
        T8[Ngồi xem Live Dashboard] --> T9{Trạng thái Lô bài}
        T9 -->|Cần duyệt lại| T10[Mở Resolution Desk sửa điểm]
        T9 -->|Tất cả đã xong| T11[Bấm Publish Final Grades]
        T10 --> T11
    end

    subgraph Student["Học Sinh Journey"]
        S1([Làm bài tự luận ra giấy]) --> S2[Điện thoại quét Mã QR]
        S2 --> S3[Đăng nhập Google SSO]
        S3 --> S4[Camera WebApp: Bấm chụp trang]
        
        S4 --> S5{App check độ nét}
        S5 -->|Mờ do rung tay| S6[Cảnh báo: Yêu cầu chụp lại]
        S6 --> S4
        S5 -->|Ảnh nét| S7[Bấm Nộp Bài]
        S7 --> S8([Nhận thông báo Nộp Thành Công])
        
        S9([Mở App xem Điểm và Lời phê của AI])
    end

    subgraph Backend["Xử lý ngầm Async Pipeline"]
        B1((Event: Nhận ảnh mới)) --> B2[Workers chạy YOLO và TrOCR]
        B2 --> B3{Độ tự tin OCR}
        
        B3 -->|Thấp| B4[Dán nhãn Needs Human Review]
        B3 -->|Cao| B5[Đẩy Text sang LLM Agent]
        B5 --> B6[LLM nhả JSON Điểm số và Lý do]
        B6 --> B7[(Lưu vào DB)]
    end

    T11 -.->|Gửi Notification| S9
    B4 -->|Update Dashboard| T8
    B7 -->|Update Dashboard| T8
    T5 -.->|Học sinh quét mã| S2
    S7 ==>|API Call Push Ảnh| B1

    class T1,T2,T3,T4,T5,T8,T9,T10,T11 teacher
    class S1,S2,S3,S4,S5,S6,S7,S8,S9 student
    class B1,B7 system
    class B2,B3,B4,B5,B6 ai
```
