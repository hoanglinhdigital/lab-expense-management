# Plan: sort tăng/giảm cho `GET /api/report/expense-by-category`

Spec: `docs/api-spec/report.yaml` (đã thêm query `sortType`: `asc` | `desc`, mặc định `desc`).
Phụ thuộc: `plans/backend/07_report.md`, `plans/backend/expense_analysis.md`.

## 1. Thiết kế

- Query mới `sortType` (optional, enum `asc|desc`, default `desc` → hành vi cũ không đổi).
- `getExpenseByCategory` đổi comparator ở `report.service.ts:336`:
  `desc` = `b._amount.comparedTo(a._amount)`, `asc` = `a._amount.comparedTo(b._amount)`.
- Sort vẫn chạy **trước** `slice(skip, take)` nên phân trang đúng theo chiều đã chọn.
- Mục "Chưa phân loại" (`categoryId = null`) sort như mọi mục khác theo `amount`.
- Hai client cùng gọi endpoint (`home-client.ts`, `expense-analysis-client.ts`) không truyền
  `sortType` → vẫn `desc`, không đổi hành vi. Không sửa `route.ts` (chỉ truyền `query` xuống service).

## 2. Edge cases

- `sortType` không hợp lệ (`up`, `ASC`, rỗng) → `400 VALIDATION_ERROR` (do zod schema).
- Nhiều danh mục cùng `amount`: thứ tự ổn định theo thứ tự `Map` (giữ như hiện tại).
- Kỳ rỗng → `data: []`, `totalAmount = "0.00"`, không đổi.
- `percentage`, `meta.totalAmount` tính trên toàn bộ, không phụ thuộc chiều sort.

## 3. Test case

Test tại `test/report/report.test.js` (hiện có các case `/report/expense-by-category`):
- [x] TC1 không truyền `sortType` → `amount` giảm dần (hồi quy hành vi cũ)
- [x] TC2 `sortType=desc` → giống TC1
- [x] TC3 `sortType=asc` → `amount` tăng dần, cùng tập item với `desc`
- [x] TC4 `sortType=asc` + `parentId` → tăng dần theo danh mục con
- [x] TC5 `sortType=asc` + `pageSize=1` → trang 1 là item nhỏ nhất
- [x] TC6 `sortType=foo` → `400`
- [x] TC7 `meta.totalAmount` và tổng `percentage` không đổi giữa `asc`/`desc`

## 4. Hạng mục

**Sửa file**
- `docs/api-spec/report.yaml` — thêm query `sortType` (đã làm ở bước Plan, chờ duyệt)
- `src/lib/api/schemas/report.schema.ts` — thêm `sortType` vào `expenseByCategoryQuerySchema`
- `src/lib/services/report.service.ts` — comparator theo `query.sortType`
- `test/report/report.test.js` — thêm TC1–TC7

**Thêm file / Xóa file**: không.

**Checklist**
- [x] Duyệt spec `report.yaml`
- [x] `report.schema.ts`: thêm `sortType`
- [x] `report.service.ts`: comparator asc/desc
- [x] `report.test.js`: TC1–TC7 (đặt tên H33–H39)
- [x] Verify (lint + tsc + k6; chưa chạy `npm run build`): chạy `test/report/report.test.js`, xem `git diff`
- [x] `graphify update .`
