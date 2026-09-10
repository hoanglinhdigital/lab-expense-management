# Plan: Fix bug chức năng Transaction-Expense (Create Expense)

Nguồn: `test/transaction/expense/bug_report_production_20260906_1825.md`
Chuẩn đối chiếu PASS/FAIL: `test/transaction/expense/testscript.js` (TC01–TC27).

## Phân tích nguyên nhân

### BUG-01 (Critical) — số dư không bị trừ ở TC01 / TC05
- Không phải do `amount` thập phân. Điểm chung thật sự của TC01 & TC05: `date = "2026-09-06T10:00:00Z"` — nhỉnh hơn thời điểm chạy test.
- `getAccountBalance()` mặc định `effectiveAsOf = new Date()` và `computeBalances` lọc `date <= asOf`, nên giao dịch có `date` ở "tương lai gần" bị loại khỏi số dư hiện tại. TC02 dùng `date` quá khứ (`2026-09-05`) nên PASS.
- Fix: khi client **không** truyền query `asOf`, không áp trần ngày — trả số dư hiện tại thật (mọi giao dịch chưa xoá).

### BUG-02 (High) — `date` sai định dạng vẫn được chấp nhận
- `isoDateSchema` dùng `Date.parse()` — parse lỏng, nhận cả `"06-09-2026"`.
- Fix: chỉ chấp nhận ISO 8601 `date` hoặc `date-time` (`z.iso.date()` / `z.iso.datetime({ offset: true })`).

### BUG-03 (Medium) — `amount` là JSON number không bị từ chối
- `positiveAmountSchema` dùng `z.union([z.string(), z.number()])`.
- Fix: chỉ nhận `z.string()` + regex `^\d{1,16}(\.\d{1,2})?$`.

### BUG-04 (Medium) — id tham chiếu sai trả 404 thay vì 400
- `resolveAccount` / `resolveCategory` ném `accountNotFound()` / `categoryNotFound()` (404).
- Fix: id không tồn tại / thuộc user khác → `validationError({ <field>: ... })` (400), gộp cả hai để không lộ tồn tại tài nguyên. Ảnh hưởng TC14, TC17, TC18, TC26.

## Sửa file
- [x] `src/lib/api/validation.ts` — siết `isoDateSchema` (BUG-02); `positiveAmountSchema` chỉ nhận string (BUG-03).
- [x] `src/lib/services/transaction.service.ts` — `resolveAccount` / `resolveCategory` trả 400 (BUG-04); bỏ import `categoryNotFound` không dùng.
- [x] `src/lib/services/account.service.ts` — `getAccountBalance` không áp trần `asOf` khi client không yêu cầu (BUG-01).
- [x] `.env` — `API_BASE_URL` thêm scheme `http://` để chạy test cục bộ.

## Thêm / Xóa file
- Thêm: `plans/test/fix_create_expense_bugs.md` (file này).
- Xóa: không.

## Cập nhật API spec (`docs/api-spec/transaction.yaml`)

Đồng bộ spec với kỳ vọng trong test case (test case là chuẩn, không phải spec cũ):
- [x] Id tham chiếu sai (không tồn tại **hoặc** của user khác) → **400 `VALIDATION_ERROR`**
  kèm `error.details.<field>`, không còn `403`/`404`. Áp dụng cho `fromAccountId`,
  `toAccountId`, `categoryId`, `contactId`, và `accountId` khi lọc danh sách.
- [x] `404` chỉ còn cho **bản thân giao dịch** qua `{transactionId}` (GET/PATCH/DELETE).
  Gỡ toàn bộ `'403'` + component `Forbidden`; gỡ `'404'`/`'403'` khỏi POST và GET list.
- [x] `PositiveAmount`: nêu rõ **luôn là chuỗi**, JSON number bị từ chối.
- [x] `date`: nêu rõ chỉ nhận ISO 8601 (`date`/`date-time`), định dạng khác → 400.
- [x] Ghi chú số dư cập nhật ngay, không phụ thuộc `date` (kể cả ngày tương lai).
- [x] Đồng bộ code `resolveContact` + bộ lọc `accountId` của list sang 400 cho khớp spec.

## Verify
- [x] `npm run build`
- [x] `npm run lint`
- [x] `npm run dev` + `npm run test:api_transaction_expense` (localhost:3000) — **27/27 PASS**.
