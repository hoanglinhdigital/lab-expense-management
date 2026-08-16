# Plan Backend 02 — Account

Nguồn: `docs/api-spec/account.yaml`. Phụ thuộc: `plans/backend/00_foundation.md`.

## 1. Endpoint

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/accounts` | Danh sách + phân trang + lọc |
| POST | `/api/accounts` | Tạo nguồn tiền |
| GET | `/api/accounts/summary` | Tổng số dư, gom nhóm theo `AccountType` |
| GET | `/api/accounts/{accountId}` | Chi tiết |
| PATCH | `/api/accounts/{accountId}` | Cập nhật |
| DELETE | `/api/accounts/{accountId}` | Xoá mềm |
| GET | `/api/accounts/{accountId}/balance` | Số dư + `totalIn` / `totalOut` tại `asOf` |

Mọi query đều kèm `userId` từ session và `isDeleted: false`. **Không endpoint nào nhận `userId` từ client.**

## 2. Tính số dư

Một hàm dùng chung `computeBalances(userId, { accountIds?, asOf? })` trong `account.service.ts`, chạy 4 `groupBy` trên `Transaction` (`isDeleted: false`, `date <= asOf` nếu có):

| Nhóm | Điều kiện | Hướng |
|---|---|---|
| in-from | `type ∈ {INCOME, BORROW}`, group theo `fromAccountId` | `+ amount` |
| out-from | `type ∈ {EXPENSE, LEND, TRANSFER}`, group theo `fromAccountId` | `− amount` |
| in-to | `type = TRANSFER`, group theo `toAccountId` | `+ (receiveAmount ?? amount)` |

`currentBalance = initialBalance + in − out`. `totalIn` / `totalOut` cho endpoint `/balance` lấy trực tiếp từ ba nhóm trên.

Cách này gom toàn bộ số dư của một trang bằng số query cố định — không N+1 theo số account.

## 3. Query params & sort

- `page` (≥1, mặc định 1), `pageSize` (1–100, mặc định 20).
- `type`: có thể lặp nhiều lần → `in: [...]`. Giá trị lạ → `400`.
- `currency`: đúng 3 ký tự, viết hoa.
- `keyword`: `contains` trên `name`, `trim()`, bỏ qua nếu rỗng.
- `sort`: `created_desc` (mặc định) | `created_asc` | `name_asc` | `name_desc` | `balance_asc` | `balance_desc`.
  - 4 sort đầu → `orderBy` ở DB, phân trang bằng `skip/take`.
  - `balance_*` không sort được ở DB (số dư là giá trị tính toán) → lấy toàn bộ account khớp bộ lọc, tính số dư, sort trong bộ nhớ rồi cắt trang. Chấp nhận được vì mỗi user chỉ có vài chục nguồn tiền; sẽ ghi comment nêu rõ giới hạn này tại chỗ.

## 4. Nghiệp vụ & edge case

| Tình huống | Kết quả |
|---|---|
| Tạo trùng tên (cùng user, chưa xoá) | `409 ACCOUNT_NAME_DUPLICATED` |
| Trùng tên với account **đã xoá mềm** | Cho phép tạo — unique key DB `[userId, name]` vẫn chặn, nên khi tạo phải đổi tên account cũ đã xoá thành `<name>#<id>` hoặc dùng kiểm tra ở service + bắt lỗi P2002 → **chọn: bắt P2002 và trả `409` kèm gợi ý**, ghi rõ giới hạn trong code |
| `currency` không có trong bảng `Currency` | `400 VALIDATION_ERROR` |
| `isDefault: true` khi tạo/sửa | Trong cùng `$transaction`: `updateMany` bỏ cờ ở mọi account khác của user, rồi set cờ cho account này |
| Đổi `currency` khi account đã có transaction | `409 ACCOUNT_CURRENCY_LOCKED` |
| Đổi `initialBalance` | Cập nhật luôn `currentBalance` cache trong cùng `$transaction` |
| Truy cập account của user khác | `404 ACCOUNT_NOT_FOUND` (không trả `403` để tránh dò id — spec cho phép cả hai, chọn `404`; account đã xoá mềm cũng trả `404`) |
| Xoá account còn transaction chưa xoá | `409 ACCOUNT_HAS_TRANSACTIONS`, `details.transactionCount` |
| Xoá account là `isDefault` | Cho phép, nhưng sau khi xoá không tự gán default cho account khác (spec không yêu cầu) |
| `asOf` sai định dạng ISO | `400 VALIDATION_ERROR` |

Đếm transaction khi xoá phải tính cả `fromAccountId` **và** `toAccountId`.

## 5. Summary

`GET /accounts/summary`: lấy mọi account chưa xoá → tính số dư → quy đổi từng số dư về `currency` (mặc định `defaultCurrency` của user) qua `domain/money.ts` → gom theo `type`, tính `subtotal`, giữ thứ tự enum `AccountType`. Nhóm rỗng bị loại khỏi `groups`. `label` lấy từ `src/lib/api/constants.ts`.

## 6. Hạng mục

### Thêm file

- `src/app/api/accounts/route.ts` — `GET`, `POST`
- `src/app/api/accounts/summary/route.ts` — `GET`
- `src/app/api/accounts/[accountId]/route.ts` — `GET`, `PATCH`, `DELETE`
- `src/app/api/accounts/[accountId]/balance/route.ts` — `GET`
- `src/lib/services/account.service.ts` — gồm `computeBalances()` dùng chung cho plan 07
- `src/lib/api/schemas/account.schema.ts`
- `src/lib/api/serializers/account.serializer.ts`

### Sửa file

- Không sửa file có sẵn (ngoài phần đã làm ở plan 00).

### Xóa file

- Không xoá file nào.

## 7. Test case

| # | Tình huống | Kỳ vọng |
|---|---|---|
| B1 | Tạo account hợp lệ | `201`, `currentBalance == initialBalance` |
| B2 | Tạo trùng tên | `409 ACCOUNT_NAME_DUPLICATED` |
| B3 | Tạo với `currency = "XYZ"` | `400`, `details.currency` |
| B4 | Tạo với `isDefault: true` khi đã có default khác | Account cũ `isDefault = false`, chỉ còn đúng 1 default |
| B5 | List không filter | Chỉ account của user hiện tại, không lẫn user khác |
| B6 | List `?type=CASH&type=E_WALLET` | Chỉ 2 loại đó, `meta.total` đúng |
| B7 | List `?sort=balance_desc` | Thứ tự giảm dần theo số dư đã tính |
| B8 | List `?keyword=` (rỗng) | Không lọc, trả như không truyền |
| B9 | List `?pageSize=101` | `400 VALIDATION_ERROR` |
| B10 | GET account của user khác | `404 ACCOUNT_NOT_FOUND` |
| B11 | PATCH `initialBalance` | `currentBalance` dịch đúng bằng lượng chênh lệch |
| B12 | PATCH `currency` khi đã có transaction | `409 ACCOUNT_CURRENCY_LOCKED` |
| B13 | PATCH body `{}` | `400 VALIDATION_ERROR` |
| B14 | DELETE account không có transaction | `204`, `isDeleted = true`, biến mất khỏi list |
| B15 | DELETE account còn transaction | `409 ACCOUNT_HAS_TRANSACTIONS`, `details.transactionCount` đúng |
| B16 | DELETE account chỉ là `toAccountId` của một TRANSFER | Vẫn `409` |
| B17 | `/balance` sau 1 INCOME 100 + 1 EXPENSE 30 | `totalIn=100`, `totalOut=30`, `currentBalance = initial + 70` |
| B18 | `/balance?asOf=<trước giao dịch>` | Trả đúng `initialBalance`, không tính giao dịch sau mốc |
| B19 | `/balance` sau khi xoá mềm giao dịch | Giao dịch đã xoá không được tính |
| B20 | `/summary` với 2 currency khác nhau | `totalBalance` đã quy đổi, `groups` gom đúng theo `type` |
| B21 | `/summary?currency=XYZ` | `404 CURRENCY_NOT_SUPPORTED` |

## 8. Checklist

- [x] Viết `src/lib/api/schemas/account.schema.ts`
- [x] Viết `src/lib/api/serializers/account.serializer.ts`
- [x] Viết `computeBalances()` trong `src/lib/services/account.service.ts`
- [x] Viết phần còn lại của `account.service.ts` (list, create, get, update, delete, summary, balance)
- [x] Viết route `GET|POST /api/accounts`
- [x] Viết route `GET /api/accounts/summary`
- [x] Viết route `GET|PATCH|DELETE /api/accounts/[accountId]`
- [x] Viết route `GET /api/accounts/[accountId]/balance`
- [x] Chạy `npm run lint` + `npm run build`
- [x] Chạy test script kiểm chứng B1–B21
