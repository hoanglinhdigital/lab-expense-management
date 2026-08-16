# Plan Backend 00 — Nền tảng (schema, dependency, lớp dùng chung)

Plan gốc của toàn bộ backend. **Mọi plan 01–07 phụ thuộc vào plan này**, phải làm xong trước.

## 1. Bối cảnh & quyết định đã chốt

| Vấn đề | Quyết định |
|---|---|
| Cơ chế session | Bảng `Session` trong DB, cookie `session` httpOnly chứa token đối chiếu DB |
| Dependency mới | `bcryptjs` (+ `@types/bcryptjs`), `zod` |
| Tiền tệ & tỷ giá | Thêm model `Currency` + `ExchangeRate` vào Prisma, seed dữ liệu |
| Contact API | Đã soạn `docs/api-spec/contact.yaml`, implement ở plan 04 |

## 2. Lệch giữa spec và `schema.prisma` hiện tại — cần bổ sung

| Spec yêu cầu | Hiện trạng | Xử lý |
|---|---|---|
| `Account.description` (account.yaml) | Không có field | Thêm `description String? @db.VarChar(200)` |
| `Transaction.receiveAmount` (transaction.yaml) | Không có field | Thêm `receiveAmount Decimal? @db.Decimal(18,2)` |
| Cookie `session` (auth.yaml) | Không có model | Thêm model `Session` |
| `/currencies`, `/utility/exchange-rate` | Không có model | Thêm model `Currency`, `ExchangeRate` |

## 3. Điểm nghiệp vụ cần thống nhất

**Công thức số dư.** Yêu cầu bạn nêu trong đề bài bỏ sót `BORROW`/`LEND`. Tôi theo `account.yaml` (bản đầy đủ):

```
currentBalance = initialBalance
  + Σ amount (INCOME, BORROW)        có fromAccountId = account
  + Σ (receiveAmount ?? amount)      của TRANSFER có toAccountId = account
  − Σ amount (EXPENSE, LEND)         có fromAccountId = account
  − Σ amount                         của TRANSFER có fromAccountId = account
```
Chỉ tính transaction `isDeleted = false`.

**Cột `currentBalance` trong DB.** Giữ làm cache ghi-xuyên (write-through): cập nhật trong cùng `$transaction` mỗi khi ghi/sửa/xoá transaction hoặc đổi `initialBalance`. Endpoint `GET /accounts/{id}/balance` và các báo cáo vẫn **tính lại bằng aggregate** vì cần tách `totalIn`/`totalOut` và cần hỗ trợ `asOf` — nhờ vậy cache lệch cũng không làm sai báo cáo.

**Quy đổi tiền tệ trong báo cáo.** Dùng bảng `ExchangeRate` với `base = defaultCurrency` của user (hoặc query `currency`). Quy đổi ở tầng service sau khi đã gom nhóm theo currency gốc, không quy đổi từng dòng để tránh sai số cộng dồn.

## 4. Cấu trúc thư mục code

```
src/lib/api/          # lớp hạ tầng HTTP dùng chung
  errors.ts           # ApiError + bảng mã lỗi
  response.ts         # ok / created / noContent / toErrorResponse
  handler.ts          # withAuth() bọc route handler, bắt lỗi tập trung
  session.ts          # tạo/đọc/huỷ session cookie
  validation.ts       # parseJson / parseQuery bằng zod, map lỗi -> details
  pagination.ts       # chuẩn hoá page/pageSize + PaginationMeta
src/lib/domain/       # tiện ích nghiệp vụ thuần
  decimal.ts          # cộng/trừ/so sánh Decimal, format ra chuỗi 2 số lẻ
  datetime.ts         # cắt mốc ngày/tháng theo IANA timezone
  money.ts            # quy đổi tiền tệ theo ExchangeRate
src/lib/services/     # nghiệp vụ, không biết gì về Request/Response
  account.service.ts  category.service.ts  contact.service.ts
  transaction.service.ts  currency.service.ts  report.service.ts
src/app/api/...       # Route Handlers, mỗi file chỉ parse -> gọi service -> trả response
```

Nguyên tắc: **route handler không chứa nghiệp vụ**, service không import `next/server`.

## 5. Hạng mục

### Thêm file

- `src/lib/api/errors.ts` — `ApiError` (status, code, message, details) + factory: `unauthorized()`, `forbidden()`, `notFound()`, `conflict()`, `validationError()`, `internalError()`.
- `src/lib/api/response.ts` — `ok(data, meta?)`, `created(data)`, `noContent()`, `toErrorResponse(err)`; luôn bọc `{ data, meta }` / `{ error }` đúng spec.
- `src/lib/api/handler.ts` — `withAuth(fn)` lấy user từ session, ném `unauthorized()` nếu không có; bắt `ApiError` và lỗi lạ (log + trả `INTERNAL_ERROR`).
- `src/lib/api/session.ts` — `createSession(userId)`, `getSessionUser()`, `destroySession()`; cookie `session`, `httpOnly`, `sameSite=lax`, `secure` khi production, `maxAge` 30 ngày.
- `src/lib/api/validation.ts` — `parseJsonBody(req, schema)`, `parseQuery(url, schema)`; zod issue → `details` theo tên field.
- `src/lib/api/pagination.ts` — schema zod cho `page`/`pageSize` (min/max/default theo từng spec), helper `skip/take` + `buildMeta`.
- `src/lib/domain/decimal.ts` — bọc `Prisma.Decimal`: `toAmountString()` (2 chữ số lẻ), `sum()`, `sub()`, `isPositive()`.
- `src/lib/domain/datetime.ts` — `startOfDay/Week/Month/Year(date, tz)`, `endOf*`, `monthRange(months, tz)`, `formatMonthKey(date, tz)`, `assertValidTimezone(tz)`.
- `src/lib/domain/money.ts` — `convert(amount, from, to, rates)`, `loadRates(base)`; `from === to` trả nguyên giá trị, thiếu tỷ giá ném `CURRENCY_NOT_SUPPORTED`.
- `src/lib/api/constants.ts` — nhãn hiển thị `AccountType` (dùng cho `AccountGroup.label`) và nhãn kỳ báo cáo.

### Sửa file

- `prisma/schema.prisma`:
  - `Account`: thêm `description String? @db.VarChar(200)`.
  - `Transaction`: thêm `receiveAmount Decimal? @db.Decimal(18, 2)`.
  - Thêm model `Session` — `id`, `token @unique`, `userId`, `expiresAt`, `createdAt`; quan hệ `User` `onDelete: Cascade`; index `[userId]`, `[expiresAt]`; `@@map("session")`.
  - Thêm model `Currency` — `code @id @db.VarChar(3)`, `name`, `symbol`, `decimalDigits Int @default(2)`, `region String?`, `sortOrder Int @default(0)`, `createdAt`, `updatedAt`; `@@map("currency")`.
  - Thêm model `ExchangeRate` — `id`, `base @db.VarChar(3)`, `code @db.VarChar(3)`, `rate Decimal @db.Decimal(24, 8)`, `createdAt`, `updatedAt`; `@@unique([base, code])`; `@@map("exchange_rate")`.
  - `User`: thêm quan hệ ngược `sessions Session[]`.
- `package.json`: thêm `bcryptjs`, `zod` vào `dependencies`; `@types/bcryptjs` vào `devDependencies`.
- `prisma/seed.ts`: seed bảng `Currency` (VND, USD, EUR, JPY, KRW, CNY, GBP, AUD, SGD, THB) và `ExchangeRate` hai chiều với `base = VND` và `base = USD`; giữ nguyên phần seed hiện có.
- `.env`: thêm `SESSION_COOKIE_NAME=session` và `SESSION_TTL_DAYS=30` (giá trị mặc định vẫn hardcode trong code nếu thiếu biến).

### Xóa file

- Không xoá file nào ở bước này. Các `src/lib/*-client.ts` là stub của frontend, sẽ nối vào API thật ở một task frontend riêng — **không đụng tới trong loạt plan backend này**.

## 6. Test case

| # | Tình huống | Kỳ vọng |
|---|---|---|
| F1 | `npx prisma migrate dev` với schema mới | Migration chạy sạch, không mất dữ liệu bảng cũ |
| F2 | `npx prisma db seed` chạy lại lần 2 | Idempotent, không nhân đôi currency / exchange rate |
| F3 | Gọi bất kỳ API (trừ auth) không có cookie | `401 UNAUTHORIZED` |
| F4 | Cookie `session` có token đã hết hạn | `401 UNAUTHORIZED`, session bị xoá khỏi DB |
| F5 | `convert(100, "USD", "USD", rates)` | Trả đúng `100`, không tra bảng tỷ giá |
| F6 | `convert(1, "XYZ", "VND", rates)` | Ném `CURRENCY_NOT_SUPPORTED` (`404`) |
| F7 | `startOfMonth('2026-08-31T23:30:00+07:00', 'Asia/Ho_Chi_Minh')` | Ra `2026-07-31T17:00:00Z`, không lệch sang tháng sau |
| F8 | Service ném lỗi lạ (không phải `ApiError`) | Route trả `500 INTERNAL_ERROR`, không lộ stack ra response |

## 7. Checklist

- [x] Cài `bcryptjs`, `@types/bcryptjs`, `zod`
- [x] Cập nhật `prisma/schema.prisma`: `Account.description`, `Transaction.receiveAmount`
- [x] Thêm model `Session` vào `prisma/schema.prisma`
- [x] Thêm model `Currency` và `ExchangeRate` vào `prisma/schema.prisma`
- [x] Chạy `npx prisma migrate dev` tạo migration mới
- [x] Cập nhật `prisma/seed.ts` seed currency + exchange rate (idempotent)
- [x] Viết `src/lib/api/errors.ts`
- [x] Viết `src/lib/api/response.ts`
- [x] Viết `src/lib/api/session.ts`
- [x] Viết `src/lib/api/handler.ts`
- [x] Viết `src/lib/api/validation.ts`
- [x] Viết `src/lib/api/pagination.ts`
- [x] Viết `src/lib/api/constants.ts`
- [x] Viết `src/lib/domain/decimal.ts`
- [x] Viết `src/lib/domain/datetime.ts`
- [x] Viết `src/lib/domain/money.ts`
- [x] Chạy `npm run lint` và `npm run build` xác nhận không lỗi type
