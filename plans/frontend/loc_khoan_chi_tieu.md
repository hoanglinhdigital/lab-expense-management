# Plan: Lọc danh sách khoản chi tiêu theo category và khoảng thời gian

## Bối cảnh

`src/app/page.tsx` đã đọc `searchParams` (`categoryId`, `from`, `to`), lọc dữ liệu qua Prisma và import
`ExpenseFilter`, nhưng component này chưa tồn tại (build sẽ lỗi). API `GET /api/expenses` cũng đã hỗ trợ
sẵn 3 query param này. `ExpenseTable` đã tính `total` nhưng chưa render ra UI.

=> Chỉ cần bổ sung 2 phần còn thiếu, không đổi logic đã có.

## Thêm file

- [x] `src/app/components/ExpenseFilter.tsx` — form lọc (select category + input from/to dạng date), submit
  bằng GET (native form hoặc `router.push` cập nhật query string) để cập nhật `searchParams` của trang.

## Sửa file

- [x] `src/app/components/ExpenseTable.tsx` — hiển thị tổng số tiền (`total`) của danh sách đang lọc, đặt
  phía trên hoặc dưới bảng.

- [x] `src/app/page.tsx` — thêm `<ExpenseFilter categories={categories} />` vào giữa form thêm khoản chi và
  bảng danh sách.

## Không đổi

- `src/app/api/expenses/route.ts` (đã hỗ trợ categoryId/from/to)
