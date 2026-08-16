# Plan — Thiết kế lại Entity model (multi-user)

## Mục tiêu

Chuyển schema từ mô hình single-user (`Category` + `Expense`) sang mô hình multi-user với
`User`, `Account`, `Category` (SYSTEM/USER), `Contact`, `Transaction` gộp mọi loại giao dịch.

## Hạng mục

### Thêm file
- (không có file mới ở bước schema — migration sẽ do sub-agent `database-migrate` sinh ra)

### Sửa file
- `prisma/schema.prisma` — viết lại toàn bộ entity model.

### Xóa file
- (không xoá file; model `Expense` bị thay bằng `Transaction` ngay trong `schema.prisma`)

## Checklist

- [x] Thêm enum `TransactionType`, `CategoryType`, `CategoryScope`, `AccountType`
- [x] Thêm model `User` (email unique, name, passwordHash, defaultCurrency)
- [x] Thêm model `Account` (type, initialBalance, currency, icon, isDefault)
- [x] Viết lại model `Category` (scope SYSTEM/USER, userId nullable, parent/child)
- [x] Thêm model `Contact` (đối tượng vay/cho mượn)
- [x] Thêm model `Transaction` gộp INCOME/EXPENSE/TRANSFER/BORROW/LEND
- [x] Áp dụng base field bắt buộc (`id`, `createdAt`, `updatedAt`, `isDeleted`) cho mọi model
- [x] Khai báo `@relation` tường minh + `onDelete` cho mọi FK
- [x] Đánh index theo truy vấn dự kiến + `@@map` tên bảng lowercase số ít
- [x] In sơ đồ quan hệ và bảng đối chiếu truy vấn ↔ index
- [x] Chạy migration (`20260816041554_redesign_entity_model_multi_user`, có reset DB dev theo yêu cầu user)
- [x] Viết lại `prisma/seed.ts` cho schema mới và seed dữ liệu mẫu
- [ ] Cập nhật các API route / component đang dùng model `Expense` (task riêng)

## Quyết định thiết kế

1. `Transaction.categoryId` **nullable**: TRANSFER / BORROW / LEND không bắt buộc có category.
2. `Transaction.fromAccountId` là nguồn tiền chính (bắt buộc); `toAccountId` chỉ dùng cho TRANSFER.
3. `Category.userId` nullable — `null` ⇔ `scope = SYSTEM`. Ràng buộc này DB không tự kiểm tra
   được, phải validate ở tầng service (và chặn update/delete category có `scope = SYSTEM`).
4. `Category.type` dùng enum riêng `CategoryType` (INCOME | EXPENSE) thay vì `TransactionType`,
   để không xuất hiện giá trị TRANSFER/BORROW/LEND vô nghĩa cho category.
5. Số dư account = `initialBalance` + tổng hợp từ `transaction` (không lưu cột balance
   denormalized để tránh lệch dữ liệu).
6. `onDelete`: mọi quan hệ thuộc sở hữu user → `Cascade` từ `User`; các FK tham chiếu
   (category, account, contact) → `Restrict` vì hệ thống dùng soft delete.
