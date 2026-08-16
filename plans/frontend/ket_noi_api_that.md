# Kết nối frontend với API thật (thay dữ liệu giả)

## Bối cảnh

Backend đã hoàn thiện đầy đủ (`src/app/api/**`), mọi route đều dùng `withAuth`
(session cookie httpOnly) và lọc theo `userId` lấy từ session — không route nào
nhận `userId` từ client. Lỗi trả về đúng chuẩn `{ error: { code, message, details } }`
với mã 400/401/403/404/409/500, khớp `docs/api-spec/*.yaml`.

Toàn bộ 6 file "data layer" phía client hiện là **stub**: giả lập `delay()` rồi trả
mảng hardcode, không hề gọi `fetch`. Không có shared fetch client, không có
middleware bảo vệ route. Task này thay các stub bằng lời gọi API thật, giữ nguyên
kiểu dữ liệu xuất ra (để UI không phải sửa) trừ khi API không có field tương ứng.

**Giữ nguyên mọi validation hiện có trên form** (`auth-client.ts` validateLogin/
validateRegister, `RecordScreen.validate()`, v.v.) — chỉ thay phần gọi mạng.

## Vấn đề cần quyết định trước khi code

1. **`ADJUSTMENT`** trong `RecordType` không tồn tại trong `TransactionType` của
   Prisma và **không được coi là một loại giao dịch riêng** (theo yêu cầu user).
   Khi lưu, tính `difference = newBalance − currentBalance` (đã có sẵn trong
   `AdjustmentForm`):
   - `difference < 0` → tạo giao dịch `EXPENSE`, `amount = abs(difference)`.
   - `difference > 0` → tạo giao dịch `INCOME`, `amount = difference`.
   - `difference === 0` → không xảy ra, `validate()` đã chặn (newBalance phải khác balance hiện tại).
   - `note` = `"ADJUST-" + (form.note đã trim, có thể rỗng)` — luôn có tiền tố `ADJUST-` dù user không nhập ghi chú.
   - Gọi `POST /api/transactions` với `type` suy ra ở trên, `fromAccountId = form.fromAccountId`, `categoryId = form.categoryId`, không có `toAccountId`/`contactId`.
   - Vì `type` (EXPENSE hay INCOME) chỉ xác định được **sau khi** biết dấu của
     `difference`, và backend bắt buộc `categoryId` phải cùng `type` với giao dịch
     (`category.type === transactionType`), category cho phép chọn trong
     `AdjustmentForm` phải đổi theo dấu của `difference` tại thời điểm nhập, không
     cố định `EXPENSE` như config tĩnh hiện tại (xem mục sửa `AdjustmentForm.tsx`
     và `RecordScreen.tsx` bên dưới). Không cần đổi schema/backend.
2. **Setting — membership card**: `UserResponse` (`auth/me`) không có
   `membershipLabel`/`validUntil`. Giữ nguyên hằng số tĩnh cho hai field này (không
   phải dữ liệu giả về *giao dịch/tài khoản*, chỉ là nội dung UI chưa có tính năng
   membership ở backend) — chỉ thay `displayName` bằng `user.name` thật.
3. **Report — các tab MONTH/QUARTER/YEAR/CUSTOM**: không có API/mockup tương ứng
   (comment gốc đã ghi rõ). Giữ nguyên hành vi trả rỗng cho các tab này; chỉ nối
   tab `CURRENT` với `GET /report/overview` (đã có sẵn `periods` today/week/month/year).
4. **Bảo vệ route**: hiện không có `src/middleware.ts`. Thêm middleware nhẹ, chỉ
   check **có/không có cookie `session`** (không gọi DB ở edge):
   - Chưa có cookie mà vào `(main)/**` → redirect `/login`.
   - Có cookie mà vào `(auth)/login` hoặc `(auth)/register` → redirect `/`.
   Middleware không thay cho việc BE trả 401 khi cookie hết hạn/không hợp lệ — các
   client vẫn phải tự xử lý 401 (mục 3 bên dưới).

## Thêm file

- [x] `src/lib/api/client.ts` — shared fetch wrapper phía client:
  - `apiFetch<T>(path, init)`: gọi `fetch("/api" + path, { credentials: "include", headers: {"Content-Type": "application/json"}, ...init })`.
  - Parse response JSON; nếu `!res.ok` thì `throw new ApiClientError({ status, code, message, details })` lấy từ envelope `{ error: {...} }`.
  - Export `class ApiClientError extends Error { status, code, details }`.
  - Export message mặc định theo status khi backend không trả message (network lỗi, 500 rỗng...): dùng tiếng Việt, ví dụ 401 → "Vui lòng đăng nhập để tiếp tục.", 403 → "Bạn không có quyền thực hiện thao tác này.", 404 → "Không tìm thấy dữ liệu.", còn lại → "Đã có lỗi xảy ra, vui lòng thử lại sau."
  - Helper `toDecimal(n: number): string` và `fromDecimal(s: string): number` để chuyển đổi `DecimalAmount` (string) ⇄ number dùng trong UI types hiện tại.
- [x] `src/proxy.ts` (Next.js 16.3.0 đổi tên convention `middleware.ts` → `proxy.ts`, export hàm `proxy()` thay vì `middleware()`) — matcher `(main)` + `(auth)` routes, check cookie theo mục "Vấn đề cần quyết định" #4. Khai lại tên cookie `"session"` trực tiếp (không import code có `next/headers`/Prisma vào proxy — chạy edge runtime).

## Sửa file

- [x] `src/lib/auth-client.ts`
  - `login()` → `POST /api/auth/login` `{ email, password }`. 200 → `{ ok: true }`. Lỗi 400/401 → `{ ok: false, message }` lấy từ `ApiClientError.message`.
  - `register()` → `POST /api/auth/register` `{ email, password, name: firstName + " " + lastName trimmed }`. 201 → `{ ok: true }`. Lỗi 400/409 → `{ ok: false, message }`.
  - Giữ nguyên `validateLogin`/`validateRegister`/`hasErrors`/`FieldErrors` không đổi.
  - Sau login/register thành công không cần lưu gì ở client — cookie đã do server set.

- [x] `src/lib/home-client.ts`
  - `fetchHomeOverview(range)` gọi song song (`Promise.all`) và ghép kết quả:
    - `GET /api/auth/me` → `user.name`
    - `GET /api/report/total-balance` → `balance.total/currency` (parse decimal)
    - `GET /api/report/expense-vs-income` (kỳ tháng hiện tại, mặc định server) → `flow.income/expense/currency`
    - `GET /api/report/expense-by-category?flow=EXPENSE` → `expenseByCategory[]` (map `categoryId→id`)
    - `GET /api/utility/exchange-rate` → `exchangeRates[]` (map `code, symbol, region, rate`)
    - `GET /api/report/expense-analysis?months=<theo range>` → `monthly[]` (map `month, expense→amount`; dùng `expense` vì khối "Expense analysis" hiện chỉ vẽ chi tiêu — giữ đúng hành vi hiện tại)
    - `GET /api/report/money-lend-borrow?pageSize=5` (mặc định sort `amount_desc` sẵn) → `loans[]` (map `id, kind, note, amount, date` — `date` cắt về `yyyy-MM-dd`)
  - Một lời gọi lỗi (401/403/...) thì toàn bộ `fetchHomeOverview` reject với `ApiClientError` đầu tiên gặp — giữ nguyên hành vi "toàn màn hiện FormAlert" của `HomeScreen` hiện tại (không cần sửa `HomeScreen.tsx`).
  - Bỏ toàn bộ mock `MONTHLY`/`OVERVIEW`, các hằng test data.

- [x] `src/lib/report-client.ts`
  - `fetchReportOverview()` → `GET /api/report/overview`, map `statement` giữ nguyên field name, `flow` lấy từ phần tử `periods` có `id === "this_month"` (map `income/expense`).
  - `fetchFlowDetail(tab)`:
    - `tab === "CURRENT"` → dùng lại `GET /api/report/overview`, map `periods[]` (bỏ `today/this_week/this_month/this_year` sang `id/label` tiếng Việt hiện có trong mock — giữ label cứng theo `PeriodFlow.label` gốc vì API chỉ trả `label` tiếng Việt kiểu "Tháng này", cần đối chiếu với mockup `report-current.png` để chọn field hiển thị đúng); `scopeLabel` có thể suy ra từ năm hiện tại `"In {year}"`.
    - Các tab khác → giữ nguyên hành vi trả rỗng (không có API).

- [x] `src/lib/account-client.ts`
  - `fetchAccountOverview()` → `GET /api/accounts/summary`. Map `AccountSummary.groups[].accounts[]` (mỗi `Account` → `AccountItem`: `id, name, kind=type, currency, balance=currentBalance (parse decimal), description`). `totalBalance = parse(data.totalBalance)`. Vì `AccountType` backend có nhiều giá trị hơn `AccountKind` frontend (SAVING_ACCOUNT, IC_CARD, INVESTMENT, OTHER ngoài phạm vi task) — lọc/giữ nguyên type lạ bằng cách ép kiểu, không loại bỏ dữ liệu người dùng (hiển thị đúng `type` gốc, `accountKindLabel` đã có fallback).
  - `createAccount(input)` → `POST /api/accounts` `{ name, type: kind, initialBalance: toDecimal(balance), currency, description }`. 201 → map response `Account` thành `AccountItem`.
  - Xoá `RATE_TO_VND` mock — `AccountSummaryResponse.totalBalance` đã được server quy đổi sẵn, không cần tính tay ở client nữa.
  - Lỗi 409 (trùng tên) → ném `ApiClientError`, để `AccountScreen`/form tạo tài khoản bắt và hiển thị qua `FormAlert` (cần kiểm tra form tạo account hiện xử lý lỗi thế nào — nếu chưa có `try/catch`, bổ sung như pattern của `RecordScreen.submit()`).

- [x] `src/lib/record-client.ts`
  - `fetchRecordOptions()` → gọi song song `GET /api/accounts` (pageSize đủ lớn, ví dụ 100), `GET /api/categories` (không lọc, lấy cả SYSTEM+USER), `GET /api/contacts`, `GET /api/utility/exchange-rate`. Map:
    - `accounts`: `Account → AccountOption` (`symbol` = ký tự đầu tên, dùng lại `accountInitial`-kiểu logic đã có ở `account-types.ts` nếu tái dùng được, hoặc tính tại chỗ).
    - `categories`: `Category → CategoryOption` (`icon` có thể null → `""`).
    - `contacts`: `Contact → ContactOption`.
    - `exchangeRates`: dựng `Record<string, number>` bằng `rateKey(base, code)` cho từng cặp tiền tệ **đang được dùng bởi accounts** (không phải mọi cặp — endpoint chỉ trả 1 base tại 1 thời điểm, nên gọi `GET /api/utility/exchange-rate` với `base` lần lượt là từng currency khác nhau đang xuất hiện trong danh sách account, gộp kết quả). Nếu chỉ có 1 currency duy nhất trong accounts thì bỏ qua bước này.
  - `createCategory(input)` → `POST /api/categories` `{ name, type, parentId, icon }`. 201 → map `Category → CategoryOption`.
  - `createContact(name)` → `POST /api/contacts` `{ name }`. 201 → map `Contact → ContactOption`.
  - `saveTransaction(form)`:
    - Ghép `date` (ISO, dùng `toDateTime(form.date, form.time).toISOString()` từ `@/lib/format`).
    - `type === "ADJUSTMENT"` → suy ra `type` thật (`EXPENSE`/`INCOME`) và `amount`
      từ dấu của `difference` (mục quyết định #1), `note = "ADJUST-" + form.note.trim()`,
      rồi gọi `POST /api/transactions` như một giao dịch EXPENSE/INCOME bình thường
      (không có `toAccountId`/`receiveAmount`/`contactId`).
    - Các type còn lại → `POST /api/transactions` `{ type, amount: toDecimal(...), receiveAmount: form.receiveAmount ? toDecimal(...) : null, date, note: form.note || null, fromAccountId, toAccountId: config.hasToAccount ? form.toAccountId : null, categoryId: config.hasCategory ? form.categoryId : null, contactId: config.hasContact ? form.contactId : null }`.
    - Cần biết `currentBalance` của `fromAccountId` để tính `difference` — lấy từ
      `options.accounts` (đã có `balance` hiện tại), truyền kèm vào `saveTransaction`
      hoặc tính ngay trong `RecordScreen.submit()` trước khi gọi (quyết định khi code:
      giữ chữ ký `saveTransaction(form, options)` để hàm tự tính, tránh
      `RecordScreen` phải biết chi tiết nghiệp vụ này).
  - Xoá toàn bộ mock `ACCOUNTS/CATEGORIES/CONTACTS/EXCHANGE_RATES/state`.

- [x] `src/lib/record-types.ts`
  - Thêm helper `adjustmentCategoryType(differenceSign: number): CategoryType` (hoặc tính trực tiếp tại nơi dùng): `difference < 0 → "EXPENSE"`, `difference >= 0 → "INCOME"` (mặc định `EXPENSE` khi chưa nhập `newBalance`, giữ đúng UX hiện tại là hiện sẵn danh sách category trước khi user gõ số).
  - `RECORD_TYPES` entry `ADJUSTMENT.categoryType` không còn dùng để filter category nữa (vẫn giữ lại field cho tương thích kiểu, nhưng logic filter chuyển sang dynamic — xem `AdjustmentForm.tsx`).

- [x] `src/app/components/record/AdjustmentForm.tsx`
  - Thay `categories = options.categories.filter((item) => item.type === config.categoryType)` bằng filter theo type suy ra từ dấu `difference` (đã tính sẵn trong file này ở dòng 32-34) — dùng lại helper `adjustmentCategoryType` từ `record-types.ts`.
  - `onAddCategory`/`onOpenCategory` cần mở đúng type (EXPENSE/INCOME) theo dấu hiện tại của `difference`, không phải type cố định — kiểm tra cách `RecordScreen` truyền `onAddCategory`/`categorySheetType` (hiện dùng `config.categoryType ?? "EXPENSE"` cố định ở `RecordScreen.tsx` dòng ~305) và sửa để với `form.type === "ADJUSTMENT"` thì dùng type suy ra từ `difference` thay vì `config.categoryType`.

- [x] `src/app/components/record/RecordScreen.tsx`
  - `updateField("newBalance", value)`: khi `form.type === "ADJUSTMENT"` và dấu của `difference` đổi (từ ≤0 sang >0 hoặc ngược lại) so với trước khi đổi `newBalance`, phải **xoá `categoryId` đang chọn** — nếu không, category cũ (ví dụ EXPENSE) bị gửi kèm giao dịch `INCOME` mới, backend trả `400 VALIDATION_ERROR`. Áp dụng pattern tương tự `withConvertedAmount` đang dùng cho `TRANSFER`.
  - `onAddCategory` (dòng ~302-306): với `form.type === "ADJUSTMENT"`, dùng type suy ra từ `difference` hiện tại thay vì `config.categoryType ?? "EXPENSE"`.
  - `categorySheetType` khi mở `CategorySheet` từ Adjustment cũng cần đồng bộ theo type suy ra, không phải giá trị mặc định "EXPENSE" cố định.

- [x] `src/lib/setting-client.ts`
  - `fetchUserProfile()` → `GET /api/auth/me`, map `displayName = data.name`; giữ `membershipLabel`/`validUntil` tĩnh như hiện tại (xem mục quyết định #2).
  - `logout()` → `POST /api/auth/logout`. Component gọi (`LogoutConfirmDialog` hoặc `SettingScreen`) chịu trách nhiệm `router.push("/login")` sau khi `logout()` resolve — kiểm tra file hiện tại đã làm việc này chưa, nếu chưa thì bổ sung.

- [x] Các Screen/Form đang chỉ có `catch { setFormError("...") }` chung chung (mất chi tiết lỗi từ BE) — sửa các nơi gọi `login/register/createAccount/createCategory/createContact/saveTransaction/logout` để bắt `ApiClientError` và ưu tiên hiển thị `error.message` từ BE (đã là tiếng Việt, do backend trả theo `docs/api-spec/*.yaml`) thay vì chuỗi tĩnh hiện có. Danh sách file cần rà: `LoginForm.tsx`, `RegisterForm.tsx`, `RecordScreen.tsx` (submit, handleCreateCategory, handleCreateContact), `AccountScreen.tsx` (hoặc form tạo account con của nó), `SettingScreen.tsx`/`LogoutConfirmDialog.tsx`, `HomeScreen.tsx`/`ReportScreen.tsx`/`FlowDetailScreen.tsx` (đã có `FormAlert` + `retry`, chỉ cần đổi message nguồn từ `LOAD_ERROR` cứng sang message của `ApiClientError` khi có).
  - Với lỗi **401** cụ thể: điều hướng `router.push("/login")` thay vì chỉ hiện `FormAlert`, vì phiên đã hết hạn không "thử lại" được.

- [x] `prisma/schema.prisma`, `docs/api-spec/*.yaml`: **không đổi** — task này không thêm/sửa API.

## Không làm trong task này

- Không thêm field membership/subscription vào backend.
- Không thêm API mới cho các tab Report còn thiếu (MONTH/QUARTER/YEAR/CUSTOM).

## Verify

- [x] `npm run lint`
- [x] `npm run build`
- [x] Test thủ công qua trình duyệt: đăng ký → đăng nhập (tự động qua session vừa tạo) → Home hiện đúng dữ liệu user vừa tạo → tạo Account → ghi Transaction Expense → ghi Adjustment (xác nhận qua API tạo đúng `type: EXPENSE`, `note: "ADJUST-..."`) → Report (overview + FlowDetail tab Current đúng số liệu, tab Month hiện "đang phát triển") → Setting (tên thật, membership tĩnh) → Logout → xác nhận proxy đá về `/login` khi chưa đăng nhập và không cho vào lại `/login` khi đã đăng nhập.
- [x] Test lỗi: sai mật khẩu (401 ở login) → hiển thị đúng message "Email hoặc mật khẩu không đúng." từ BE. Chưa test thủ công qua UI: 409 trùng tên account, 403 sửa category SYSTEM (logic đã có trong code — `AccountFormPanel`/service backend — nhưng chưa click-test).
