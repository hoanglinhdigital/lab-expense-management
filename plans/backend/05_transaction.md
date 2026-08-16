# Plan Backend 05 — Transaction

Nguồn: `docs/api-spec/transaction.yaml`. Phụ thuộc: plan 00, 02 (account), 03 (category), 04 (contact).

Cụm phức tạp nhất — một model phủ 5 loại nghiệp vụ, mỗi loại có bộ field và hướng tiền riêng.

## 1. Endpoint

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/transactions` | Danh sách + lọc + `meta` tổng thu/chi toàn bộ kết quả |
| POST | `/api/transactions` | Tạo, cập nhật số dư trong cùng `$transaction` |
| GET | `/api/transactions/{transactionId}` | Chi tiết kèm account/category/contact đã join |
| PATCH | `/api/transactions/{transactionId}` | Gửi lại **toàn bộ** trạng thái mong muốn (cùng shape với POST) |
| DELETE | `/api/transactions/{transactionId}` | Xoá mềm + tính lại số dư |

## 2. Ràng buộc field theo `type` (bảng chuẩn của spec)

| type | fromAccountId | toAccountId | categoryId | contactId | Số dư |
|---|---|---|---|---|---|
| `INCOME` | bắt buộc | null | bắt buộc, `type=INCOME` | null | `from` tăng |
| `EXPENSE` | bắt buộc | null | bắt buộc, `type=EXPENSE` | null | `from` giảm |
| `TRANSFER` | bắt buộc | bắt buộc, ≠ `from` | null | null | `from` giảm, `to` tăng |
| `BORROW` | bắt buộc | null | null | bắt buộc | `from` tăng |
| `LEND` | bắt buộc | null | null | bắt buộc | `from` giảm |

Cài bằng zod `discriminatedUnion("type", [...])` — một schema riêng cho mỗi type, sai bộ field là `400` với `details` theo đúng field vi phạm. Field thừa (ví dụ gửi `categoryId` cho `TRANSFER`) bị coi là lỗi, **không** âm thầm bỏ qua.

## 3. Kiểm tra tham chiếu (thứ tự cố định)

1. `fromAccountId` — thuộc user, `isDeleted = false`. Không có → `404`; có nhưng đã xoá mềm → `409 ACCOUNT_DELETED`.
2. `toAccountId` (TRANSFER) — như trên, và phải khác `fromAccountId` (`400`).
3. `categoryId` — đọc được (USER của mình **hoặc** SYSTEM), chưa xoá, và `category.type` phải khớp `type` giao dịch (`400`, `details.categoryId`).
4. `contactId` — thuộc user, chưa xoá. Không có → `404 CONTACT_NOT_FOUND`.

Dùng lại `assertCategoryReadable()` (plan 03) và `assertContactOwned()` (plan 04).

## 4. `receiveAmount`

- Chỉ hợp lệ với `TRANSFER`; gửi ở type khác → `400`.
- `TRANSFER` giữa hai account **khác** `currency` → **bắt buộc** có `receiveAmount`, thiếu là `400`.
- Hai account **cùng** `currency`: bỏ trống → lưu `null`; nếu gửi và khác `amount` → `400` (cùng tiền tệ mà số nhận khác số gửi là dữ liệu sai).
- Số tiền cộng vào `toAccount` luôn là `receiveAmount ?? amount`.

## 5. Cập nhật số dư

Mọi thao tác ghi nằm trong một `prisma.$transaction`:

```
POST:   create -> recomputeBalances([fromAccountId, toAccountId?])
PATCH:  đọc bản cũ -> validate bản mới -> update
        -> recomputeBalances(union(account cũ, account mới))
DELETE: update isDeleted = true -> recomputeBalances(account cũ)
```

`recomputeBalances(accountIds)` tính lại từ đầu bằng `computeBalances()` của plan 02 rồi ghi vào cột `currentBalance`, thay vì cộng/trừ tương đối — cộng trừ tương đối sẽ tích luỹ sai lệch qua nhiều lần sửa.

## 6. Query params của `GET /transactions`

- `page` (≥1, mặc định 1), `pageSize` (1–100, mặc định 20).
- `dateFrom` / `dateTo` — ISO 8601, bao gồm cả hai mốc; `dateFrom > dateTo` → `400`.
- `accountId` — khớp `fromAccountId` **hoặc** `toAccountId` (`OR`). Không thuộc user → `404`.
- `categoryId` + `includeChildCategories` — `true` thì mở rộng thành `[categoryId, ...id các con]`.
- `type` — lặp nhiều lần → `in: [...]`.
- `contactId`, `keyword` (`contains` trên `note`), `minAmount` / `maxAmount` (`minAmount > maxAmount` → `400`).
- `sort`: `date_desc` (mặc định) | `date_asc` | `amount_desc` | `amount_asc` | `created_desc`. Thêm `id` làm khoá phụ để phân trang ổn định khi trùng `date`.

**`meta.totalIncome` / `meta.totalExpense`** tính trên **toàn bộ** kết quả khớp bộ lọc (không chỉ trang hiện tại), chỉ gồm `INCOME` và `EXPENSE` — `TRANSFER`/`BORROW`/`LEND` không tính. Số tiền quy đổi về `defaultCurrency` của user, nên `groupBy [type, fromAccountId]` rồi quy đổi theo currency của từng account.

## 7. Edge case

| Tình huống | Kết quả |
|---|---|
| `amount = "0"` hoặc âm | `400`, `details.amount` |
| `amount` quá 2 chữ số thập phân | `400` |
| `TRANSFER` với `toAccountId == fromAccountId` | `400` |
| Transaction của user khác | `404 TRANSACTION_NOT_FOUND` |
| Transaction đã xoá mềm | `404` với GET/PATCH/DELETE |
| PATCH đổi `type` từ `EXPENSE` sang `TRANSFER` | Bắt buộc gửi `toAccountId` và **không** gửi `categoryId`; số dư của cả account cũ lẫn mới được tính lại |
| PATCH trỏ sang account đã bị xoá mềm | `409 ACCOUNT_DELETED`, `details.fromAccountId` |
| PATCH trỏ sang category đã bị xoá mềm | `409 CATEGORY_DELETED` |
| `date` ở tương lai | Cho phép — người dùng có thể ghi trước |
| `note` > 500 ký tự | `400` |
| Xoá transaction đã xoá | `404` |

## 8. Hạng mục

### Thêm file

- `src/app/api/transactions/route.ts` — `GET`, `POST`
- `src/app/api/transactions/[transactionId]/route.ts` — `GET`, `PATCH`, `DELETE`
- `src/lib/services/transaction.service.ts`
- `src/lib/api/schemas/transaction.schema.ts` — zod `discriminatedUnion` theo `type`
- `src/lib/api/serializers/transaction.serializer.ts` — `AccountRef` / `CategoryRef` / `ContactRef`

### Sửa file

- `src/lib/services/account.service.ts` — export thêm `recomputeBalances(tx, accountIds)` chạy được bên trong `$transaction`.

### Xóa file

- Không xoá file nào.

## 9. Test case

| # | Tình huống | Kỳ vọng |
|---|---|---|
| E1 | POST INCOME hợp lệ | `201`, số dư `from` tăng đúng `amount` |
| E2 | POST EXPENSE hợp lệ | `201`, số dư `from` giảm đúng `amount` |
| E3 | POST TRANSFER cùng currency | `from` giảm, `to` tăng, tổng số dư 2 account không đổi |
| E4 | POST TRANSFER khác currency có `receiveAmount` | `from` giảm `amount`, `to` tăng `receiveAmount` |
| E5 | POST TRANSFER khác currency thiếu `receiveAmount` | `400`, `details.receiveAmount` |
| E6 | POST TRANSFER cùng currency, `receiveAmount ≠ amount` | `400` |
| E7 | POST BORROW hợp lệ | `201`, số dư `from` **tăng** |
| E8 | POST LEND hợp lệ | `201`, số dư `from` **giảm** |
| E9 | POST EXPENSE với category `type = INCOME` | `400`, `details.categoryId` |
| E10 | POST EXPENSE không có `categoryId` | `400` |
| E11 | POST TRANSFER có kèm `categoryId` | `400` |
| E12 | POST BORROW không có `contactId` | `400` |
| E13 | POST với `fromAccountId` của user khác | `404` |
| E14 | POST với `categoryId` là SYSTEM | `201` — được phép dùng chung |
| E15 | POST `amount = "0"` | `400` |
| E16 | POST `toAccountId == fromAccountId` | `400` |
| E17 | GET list mặc định | Sắp xếp `date_desc`, chỉ giao dịch của user hiện tại |
| E18 | GET `?accountId=X` | Bao gồm cả giao dịch X là `toAccountId` |
| E19 | GET `?categoryId=cha&includeChildCategories=true` | Gồm cả giao dịch của danh mục con |
| E20 | GET `?type=INCOME&type=EXPENSE` | Không lẫn TRANSFER/BORROW/LEND |
| E21 | GET `?dateFrom` > `dateTo` | `400` |
| E22 | `meta.totalIncome` / `totalExpense` khi có 137 kết quả, `pageSize=20` | Tính trên cả 137, không phải 20 |
| E23 | `meta` khi trong kỳ có TRANSFER | TRANSFER không cộng vào `totalIncome`/`totalExpense` |
| E24 | GET chi tiết | Có `fromAccount`, `category`/`contact` đã join, `currency` = currency của `fromAccount` |
| E25 | PATCH đổi `amount` | Số dư dịch đúng bằng chênh lệch |
| E26 | PATCH đổi `fromAccountId` | Account cũ được hoàn lại, account mới bị trừ |
| E27 | PATCH đổi `type` EXPENSE → TRANSFER (kèm `toAccountId`, bỏ `categoryId`) | `200`, cả 3 account liên quan có số dư đúng |
| E28 | PATCH đổi `type` sang TRANSFER nhưng vẫn gửi `categoryId` | `400` |
| E29 | DELETE | `204`, số dư hoàn nguyên đúng như trước khi tạo |
| E30 | DELETE 2 lần | Lần 2 trả `404` |
| E31 | PATCH/GET transaction của user khác | `404 TRANSACTION_NOT_FOUND` |
| E32 | Tạo 3 giao dịch rồi kiểm tra `/accounts/{id}/balance` | Khớp chính xác với công thức ở plan 00 |

## 10. Checklist

- [x] Viết `src/lib/api/schemas/transaction.schema.ts` (discriminatedUnion theo `type`)
- [x] Viết `src/lib/api/serializers/transaction.serializer.ts`
- [x] Bổ sung `recomputeBalances()` vào `src/lib/services/account.service.ts`
- [x] Viết `src/lib/services/transaction.service.ts` — validate tham chiếu
- [x] Viết `src/lib/services/transaction.service.ts` — create / update / delete trong `$transaction`
- [x] Viết `src/lib/services/transaction.service.ts` — list + `meta` tổng thu/chi
- [x] Viết route `GET|POST /api/transactions`
- [x] Viết route `GET|PATCH|DELETE /api/transactions/[transactionId]`
- [x] Chạy `npm run lint` + `npm run build`
- [x] Chạy test script kiểm chứng E1–E32
