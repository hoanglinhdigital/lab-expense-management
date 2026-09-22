# Plan: nút sort Tăng/Giảm trên màn Expense Analysis

Màn hình: `/report/expense-analysis` (`ExpenseAnalysisScreen.tsx`). Không có route `/expense-report`
trong project — xem "Câu hỏi cần xác nhận". Phụ thuộc: `plans/backend/expense_by_category_sort.md`.

## 1. Thiết kế

- State `sortType: "asc" | "desc"` (mặc định `"desc"`) trong `ExpenseAnalysisScreen`, **không** đưa vào
  URL / `periodToQuery` để không ảnh hưởng `periodFromSearchParams` và các link sang màn chi tiết.
- `fetchKey` thêm `sortType` → click nút thì effect gọi lại `fetchCategoryBreakdown(period, undefined, sortType)`.
  Skeleton hiện lại trong lúc tải (theo cơ chế `isLoading` hiện có).
- Nút toggle: `desc` → `asc` và ngược lại. Icon `ArrowDownWideNarrow` / `ArrowUpNarrowWide` (lucide-react),
  nhãn "Giảm dần" / "Tăng dần", `aria-label` mô tả chiều hiện tại, vùng bấm ≥ 44px (`min-h-11`), màu theo skill frontend-coding.
- Đặt nút phía trên `CategoryBreakdownList`, chỉ hiện khi có dữ liệu (không hiện ở trạng thái loading/empty/error).
- Donut và danh sách dùng cùng `breakdown.items` nên cùng đổi thứ tự (chấp nhận, không tách riêng).
- Đổi tab Day/Month/Year hoặc khoảng kỳ: giữ nguyên `sortType` đã chọn.

## 2. Edge cases

- Bấm nhanh liên tiếp: `cancelled` trong effect đã bỏ kết quả cũ → hiển thị đúng lần bấm cuối.
- Lỗi API sau khi bấm: hiện `FormAlert` + retry (retry giữ `sortType` hiện tại).
- `401` → `router.replace("/login")` (giữ nguyên).
- Kỳ rỗng: không hiện nút.

## 3. Test case (Playwright)

- [ ] F1 mặc định: danh sách giảm dần, nút ghi "Giảm dần"
- [ ] F2 bấm nút → gọi lại API với `sortType=asc`, danh sách tăng dần, nút ghi "Tăng dần"
- [ ] F3 bấm lần nữa → về `desc`
- [ ] F4 đổi khoảng kỳ sau khi chọn `asc` → vẫn `asc`
- [ ] F5 kỳ rỗng → không có nút
- [ ] F6 API lỗi → `FormAlert`, retry hoạt động

## 4. Hạng mục

**Sửa file**
- `src/lib/expense-analysis-client.ts` — `fetchCategoryBreakdown(period, parentId?, sortType?)`, truyền `sortType` vào `buildQuery`
- `src/app/components/report/expense-analysis/ExpenseAnalysisScreen.tsx` — state, `fetchKey`, đặt nút

**Thêm file**
- `src/app/components/report/expense-analysis/SortToggleButton.tsx` — nút toggle (props: `value`, `onToggle`)
- test Playwright cho F1–F6 (vị trí theo thư mục e2e hiện có của project)

**Xóa file**: không.

**Checklist**
- [x] `expense-analysis-client.ts`: thêm tham số `sortType`
- [x] `SortToggleButton.tsx`
- [x] `ExpenseAnalysisScreen.tsx`: state + gọi lại API
- [ ] Test Playwright F1–F6
- [x] Verify (lint + tsc; chưa build): `npm run lint`, `npm run build`, xem `git diff`, `graphify update .`
