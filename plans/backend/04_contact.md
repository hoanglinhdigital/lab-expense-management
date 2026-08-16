# Plan Backend 04 — Contact

Nguồn: `docs/api-spec/contact.yaml` (**spec mới, cần duyệt cùng plan này**). Phụ thuộc: `plans/backend/00_foundation.md`.

Lý do có cụm này: `transaction.yaml` bắt buộc `contactId` cho `BORROW`/`LEND`, và mockup `record-borrow-create-contact.png` / `record-borrow-select-contact.png` có màn chọn & tạo đối tượng — nhưng `docs/api-spec/` chưa có file spec tương ứng.

## 1. Endpoint

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/contacts` | Danh sách + phân trang + tìm kiếm |
| POST | `/api/contacts` | Tạo đối tượng |
| GET | `/api/contacts/{contactId}` | Chi tiết, kèm `totalLend` / `totalBorrow` |
| PATCH | `/api/contacts/{contactId}` | Cập nhật |
| DELETE | `/api/contacts/{contactId}` | Xoá mềm |

Mọi query kèm `userId` từ session + `isDeleted: false`.

## 2. Query params

- `page` (≥1, mặc định 1), `pageSize` (1–100, mặc định 50).
- `keyword`: `contains` trên `name` **hoặc** `phone` **hoặc** `email` (`OR`).
- `sort`: `name_asc` (mặc định) | `name_desc` | `created_desc` | `created_asc`.

## 3. Tổng công nợ

`totalLend` / `totalBorrow` / `transactionCount` tính bằng một `groupBy` trên `Transaction` (`userId`, `isDeleted: false`, `type ∈ {LEND, BORROW}`) theo `[contactId, type]`, cho cả trang cùng lúc — không N+1.

Số tiền của giao dịch nằm ở tiền tệ của `fromAccount`, nên phải quy đổi về `defaultCurrency` của user qua `domain/money.ts` trước khi cộng. Thực hiện: `groupBy` theo `[contactId, type, fromAccountId]` rồi map account → currency, quy đổi, cộng dồn ở tầng service.

Ở endpoint list, hai tổng này chỉ tính khi client truyền `includeTotals=true` (mặc định `false`) để danh sách chọn contact trong màn Record không phải chịu chi phí thừa. Endpoint chi tiết luôn tính.

## 4. Edge case

| Tình huống | Kết quả |
|---|---|
| Trùng tên trong cùng user (chưa xoá) | `409 CONTACT_NAME_DUPLICATED` |
| Contact của user khác | `404 CONTACT_NOT_FOUND` |
| `email` sai định dạng | `400`, `details.email` |
| `phone` chỉ chấp nhận chữ số, khoảng trắng, `+`, `-`, `()` | Sai → `400`, `details.phone` |
| Gửi `phone: null` / `email: null` trong PATCH | Xoá giá trị (đặt về `null`), khác với không gửi field |
| PATCH body `{}` | `400 VALIDATION_ERROR` |
| DELETE khi còn transaction BORROW/LEND chưa xoá | `409 CONTACT_HAS_TRANSACTIONS`, `details.transactionCount` |
| DELETE contact sạch | `204` |

## 5. Hạng mục

### Thêm file

- `src/app/api/contacts/route.ts` — `GET`, `POST`
- `src/app/api/contacts/[contactId]/route.ts` — `GET`, `PATCH`, `DELETE`
- `src/lib/services/contact.service.ts` — kèm `assertContactOwned(userId, contactId)` cho plan 05 dùng lại
- `src/lib/api/schemas/contact.schema.ts`
- `src/lib/api/serializers/contact.serializer.ts`

### Sửa file

- Không sửa file có sẵn.

### Xóa file

- Không xoá file nào.

## 6. Test case

| # | Tình huống | Kỳ vọng |
|---|---|---|
| D1 | POST hợp lệ chỉ có `name` | `201`, `phone`/`email`/`note` = `null` |
| D2 | POST trùng tên | `409 CONTACT_NAME_DUPLICATED` |
| D3 | POST `email = "abc"` | `400`, `details.email` |
| D4 | POST `phone = "abc"` | `400`, `details.phone` |
| D5 | GET list của user A | Không lẫn contact của user B |
| D6 | GET `?keyword=<số điện thoại>` | Khớp theo `phone` |
| D7 | GET `?sort=name_asc` | Thứ tự tên tăng dần |
| D8 | GET `?includeTotals=true` sau 1 LEND 500 + 1 BORROW 200 | `totalLend = "500.00"`, `totalBorrow = "200.00"` |
| D9 | GET chi tiết | Luôn có `totalLend`, `totalBorrow`, `transactionCount` |
| D10 | GET chi tiết contact user khác | `404 CONTACT_NOT_FOUND` |
| D11 | PATCH `phone: null` | `phone` thành `null` |
| D12 | PATCH body `{}` | `400 VALIDATION_ERROR` |
| D13 | DELETE contact còn giao dịch | `409 CONTACT_HAS_TRANSACTIONS` |
| D14 | DELETE contact sạch | `204`, biến mất khỏi list |
| D15 | Tổng công nợ với 2 account khác currency | Đã quy đổi về `defaultCurrency`, không cộng thô |

## 7. Checklist

- [x] Bạn duyệt `docs/api-spec/contact.yaml`
- [x] Viết `src/lib/api/schemas/contact.schema.ts`
- [x] Viết `src/lib/api/serializers/contact.serializer.ts`
- [x] Viết `src/lib/services/contact.service.ts`
- [x] Viết route `GET|POST /api/contacts`
- [x] Viết route `GET|PATCH|DELETE /api/contacts/[contactId]`
- [x] Chạy `npm run lint` + `npm run build`
- [x] Chạy test script kiểm chứng D1–D15
