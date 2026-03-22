# Frontend Agent Rules — EXAM_OCR v2.0

> **Mục đích**: Tài liệu này là BỘ LUẬT BẮT BUỘC cho bất kỳ AI Agent nào được giao nhiệm vụ code frontend.
> Đọc kỹ trước khi viết bất kỳ dòng code nào.

---

## 1. Tech Stack (Bắt buộc)

| Hạng mục | Công nghệ | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.x |
| Language | TypeScript (strict mode) | 5.x |
| Styling | *(Chờ user quyết định: Tailwind CSS v4 hoặc CSS Modules)* | |
| Testing | Jest + React Testing Library | |
| E2E Testing | Playwright | |
| Linting | ESLint (Next.js preset) | |
| Package Manager | npm | |

---

## 2. Folder Conventions

```
src/
├── app/                    # PAGES ONLY — Next.js App Router
│   └── (teacher)/
│       └── dashboard/
│           └── page.tsx    # Chỉ chứa <DashboardPage /> import
├── components/             # REUSABLE UI
│   └── dashboard/
│       ├── KpiCard/
│       │   ├── index.tsx       # Component code
│       │   ├── KpiCard.module.css  # (nếu dùng CSS Modules)
│       │   └── KpiCard.test.tsx    # Unit test BẮT BUỘC
│       └── ExamTable/
│           ├── index.tsx
│           └── ExamTable.test.tsx
├── lib/api/                # API CLIENT — gọi mock hoặc backend
├── mocks/                  # MOCK DATA — format giống hệt API response
└── types/                  # SHARED INTERFACES — dùng chung cho cả api + components
```

### Rules:
1. **Page files (`page.tsx`)** chỉ chứa imports và render top-level component. KHÔNG viết logic ở đây.
2. **Mỗi component = 1 folder** với `index.tsx` + test file.
3. **Không nested quá 3 cấp**: `components/dashboard/KpiCard/index.tsx` ✅ — Không tạo thêm subfolder bên trong.

---

## 3. Naming Conventions

| Loại | Convention | Ví dụ |
|---|---|---|
| Component | PascalCase | `KpiCard`, `ExamTable`, `ResolutionDesk` |
| Hook | camelCase, prefix `use` | `useExams()`, `useDashboardStats()` |
| API function | camelCase, prefix `fetch/create/update` | `fetchExams()`, `createExam()` |
| Type/Interface | PascalCase | `Exam`, `Submission`, `Grade` |
| Constant | SCREAMING_SNAKE | `API_BASE_URL`, `MOCK_EXAMS` |
| File (non-component) | kebab-case | `dashboard-stats.ts`, `api-client.ts` |
| CSS class | camelCase (modules) hoặc Tailwind | `.kpiCard`, `.scoreValue` |

---

## 4. State Management

- **Local state**: `useState`, `useReducer` — cho state trong 1 component
- **Shared state**: React Context — cho auth user, theme
- **Server state**: Custom hooks (`useExams`, `useDashboardStats`) fetch từ API
- **KHÔNG dùng Redux, Zustand, Jotai** — project chưa đủ phức tạp

---

## 5. Mock API Layer (CỰC KỲ QUAN TRỌNG)

### Cách hoạt động:
```
.env.local
→ NEXT_PUBLIC_API_URL=http://localhost:8000
→ NEXT_PUBLIC_USE_MOCKS=true
```

File `src/lib/api/client.ts`:
```typescript
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

export async function apiGet<T>(path: string): Promise<T> {
  if (USE_MOCKS) {
    const { getMockResponse } = await import('@/mocks/handlers');
    return getMockResponse<T>('GET', path);
  }
  const res = await fetch(`${API_BASE_URL}${path}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
}
```

### Rules:
1. Mock data **PHẢI có cùng shape (cấu trúc)** với API response thật (xem `API_CONTRACT.md`)
2. Khi switch `NEXT_PUBLIC_USE_MOCKS=false`, app PHẢI hoạt động y hệt chỉ đổi nguồn data
3. Mỗi mock file export typed data: `export const MOCK_EXAMS: Exam[] = [...]`

---

## 6. UI Design Reference (BẮT BUỘC)

> **Trước khi code BẤT KỲ screen nào, Agent PHẢI mở và đọc ảnh tham chiếu tại:**
> `documents/stitch_clinical_enterprise_prd/{screen_folder}/`

| Screen | Reference Folder |
|---|---|
| T1 — Dashboard | `updated_dashboard_live_submission_rate/` |
| T2 — Batch Details | `updated_batch_details_ai_feedback/` |
| T3 — Exam Configurator | `updated_exam_builder_tactile/` |
| T4 — Resolution Desk | `updated_resolution_desk_ai_evaluation/` |
| T5 — QR Lobby | `exam_qr_lobby/` |
| T6 — Question Bank | *(Tự thiết kế, giữ cùng aesthetic)* |
| T7 — Classes | *(Tự thiết kế, giữ cùng aesthetic)* |

### Design Tokens (trích từ Stitch reference):
- **Background**: `#F5F0E8` (warm ivory/off-white)
- **Card Background**: `#FFFFFF` with `border-radius: 16px`, `box-shadow: 0 1px 3px rgba(0,0,0,0.06)`
- **Primary Accent**: `#4338CA` (indigo/blue cho buttons & links)
- **Success**: `#16A34A` (green)
- **Warning/Attention**: `#EA580C` (orange-red)
- **Text Primary**: `#1F2937`
- **Text Secondary**: `#6B7280`
- **Typography**: Inter hoặc system font stack
- **Spacing unit**: 4px base (8px, 12px, 16px, 24px, 32px, 48px)
- **Border radius**: 8px (inputs), 12px (cards small), 16px (cards large)

---

## 7. Testing Rules

### Unit Tests (Jest):
- **Mỗi component PHẢI có test file** (`ComponentName.test.tsx`)
- Test mức tối thiểu: renders without crashing + shows expected text/data
- Dùng `@testing-library/react` — test user behavior, NOT implementation details

### E2E Tests (Playwright):
- File đặt trong `tests/` folder root
- 3 flows chính:
  1. Teacher: Login → Dashboard → Click exam → Batch Details
  2. Teacher: Exam Configurator → Fill form → Generate QR
  3. Student: Open QR link → See exam info → Camera page

### Test Commands:
```bash
npm run test          # Unit tests
npx playwright test   # E2E tests
npm run lint          # ESLint check
```

---

## 8. Git Workflow

```
[Phase 1 done] → npm run lint && npm run test → git commit -m "feat: Phase 1 - foundation + design system" → git push
[Phase 2 done] → npm run lint && npm run test → git commit -m "feat: Phase 2 - teacher screens" → git push
[Phase 3 done] → npm run lint && npm run test → git commit -m "feat: Phase 3 - student screens" → git push
[Phase 4 done] → npm run test && npx playwright test → git commit -m "feat: Phase 4 - tests + API contract" → git tag frontend-v2.0-alpha → git push --tags
```

**KHÔNG push code nếu lint hoặc test fail.**

---

## 9. Code Quality Checklist (Chạy trước mỗi commit)

- [ ] `npm run lint` passes (0 errors)
- [ ] `npm run test` passes (0 failures)
- [ ] Tất cả components mới có test file
- [ ] Mock data đúng TypeScript interface
- [ ] Không có `any` type (trừ edge cases có comment giải thích)
- [ ] Không có `console.log` trong production code (dùng logger nếu cần)
- [ ] Mỗi page file chỉ import + render, không chứa business logic
