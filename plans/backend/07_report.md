# Plan Backend 07 — Report

Nguồn: `docs/api-spec/report.yaml`. Phụ thuộc: plan 00, 02 (account), 03 (category), 05 (transaction), 06 (currency).

## 1. Endpoint

| Method | Path | Dùng cho |
|---|---|---|
| GET | `/api/report/total-balance` | Thẻ **Total Balance** — Home |
| GET | `/api/report/expense-vs-income` | Khối **Expense vs income** — Home |
| GET | `/api/report/expense-by-category` | Donut tỷ trọng — Home |
| GET | `/api/report/expense-analysis` | Biểu đồ cột theo tháng — Home |
| GET | `/api/report/money-lend-borrow` | Khối **Money lent/borrowed** — Home |
| GET | `/api/report/overview` | Màn **Report** — cân đối + 4 kỳ |

Toàn bộ chỉ đọc, chỉ tính dữ liệu của user hiện tại, chỉ transaction `isDeleted = false`.

## 2. Quy ước chung (áp dụng cho mọi endpoint)

**Loại giao dịch**: chỉ `INCOME` là tiền vào, `EXPENSE` là tiền ra. `TRANSFER` bị loại khỏi mọi báo cáo thu/chi. `BORROW`/`LEND` chỉ xuất hiện ở `/money-lend-borrow` và phần công nợ của `/overview`.

**Kỳ báo cáo**: `dateFrom`/`dateTo` ISO 8601 UTC, bao gồm cả hai mốc. Cắt mốc ngày/tháng theo `timezone` (mặc định `Asia/Ho_Chi_Minh`) qua `domain/datetime.ts` — giao dịch lúc 23h ngày cuối tháng phải nằm đúng tháng đó. Mỗi response trả lại `range` để frontend đối chiếu kỳ server thực sự áp dụng.

**Tiền tệ**: mặc định `defaultCurrency` của user, ghi đè bằng `?currency=`. Quy đổi theo nhóm currency gốc rồi mới cộng, không quy đổi từng dòng.

**Bộ lọc trỏ tới tài nguyên người khác** (`accountId`, `categoryId`) → `404` kèm `details.<field>`.

## 3. Chi tiết từng endpoint

### `/report/total-balance`
Params: `timezone`, `currency`, `asOf`. Dùng `computeBalances(userId, { asOf })` của plan 02 cho toàn bộ account chưa xoá. `byCurrency` gom số dư **gốc** theo currency (chưa quy đổi) kèm `accountCount`; `total` là tổng đã quy đổi. `accountCount` ở cấp ngoài = số account chưa xoá.

### `/report/expense-vs-income`
Params: `dateFrom`, `dateTo`, `timezone`, `currency`, `accountId`.
Mặc định: ngày 1 → ngày cuối **tháng hiện tại** theo `timezone`. Truyền một trong hai mốc thì mốc còn lại vẫn lấy mặc định của tháng hiện tại.
`groupBy [type, fromAccountId]` với `type ∈ {INCOME, EXPENSE}` → quy đổi → `income`, `expense`, `net = income − expense`, `transactionCount` = số giao dịch INCOME + EXPENSE trong kỳ.

### `/report/expense-by-category`
Params: `page`, `pageSize`, `dateFrom`, `dateTo`, `timezone`, `currency`, `accountId`, `flow` (`EXPENSE` mặc định | `INCOME`).
Luôn **gom về danh mục cha level 1**: nạp map `categoryId → rootId` một lần, cộng số tiền của con vào cha. Response không bao giờ chứa item có `parentId != null`. Giao dịch không gắn danh mục gom vào item `categoryId: null`, `name` = `"Chưa phân loại"`.
Sắp xếp giảm dần theo `amount`. `percentage = amount / meta.totalAmount * 100`, làm tròn 2 chữ số thập phân; `totalAmount = 0` → `percentage = 0` (không chia cho 0).
`meta.totalAmount` tính trên **toàn bộ** danh mục khớp bộ lọc, không chỉ trang hiện tại. Phân trang cắt trên mảng đã gom & sort trong bộ nhớ.

### `/report/expense-analysis`
Params: `page`, `pageSize`, `timezone`, `currency`, `accountId`, `months` (1–60, mặc định 6), `dateFrom`, `dateTo`, `categoryId`.
Mặc định 6 tháng gần nhất **tính cả tháng hiện tại**. Có `dateFrom`/`dateTo` thì bỏ qua `months`.
`categoryId` mở rộng gồm cả danh mục con của nó.
**Mọi tháng trong khoảng đều phải có một phần tử**, kể cả tháng không phát sinh giao dịch → `"0.00"`. Thứ tự cũ → mới. Sinh danh sách mốc tháng trước rồi merge kết quả `groupBy` vào — không dựa vào tháng có dữ liệu.
Gom tháng theo `timezone`: đọc transaction trong khoảng rồi tính khoá `yyyy-MM` ở tầng ứng dụng, **không** dùng hàm `MONTH()` của MySQL (chạy theo timezone của DB, sẽ lệch).
`meta.totalIncome` / `totalExpense` = tổng cả khoảng.

### `/report/money-lend-borrow`
Params: `page`, `pageSize` (1–100, **mặc định 5**), `dateFrom`, `dateTo`, `timezone`, `currency`, `accountId`, `kind` (`LEND` | `BORROW`, bỏ trống = cả hai), `contactId`, `sort` (`amount_desc` mặc định | `amount_asc` | `date_desc` | `date_asc`).
Mặc định **không giới hạn thời gian** — khác các endpoint khác, không tự áp kỳ tháng hiện tại.
`data` là các transaction `LEND`/`BORROW`, `amount` quy về `meta.range.currency`. `meta.totalLend` / `totalBorrow` tính trên **toàn bộ** kết quả khớp bộ lọc.
Vì `amount` cần quy đổi trước khi sort theo tiền, `sort=amount_*` thực hiện sau khi quy đổi ở tầng service; `sort=date_*` thực hiện ở DB.
`range.dateFrom`/`dateTo` khi không truyền: trả mốc thực tế nhỏ nhất/lớn nhất của tập kết quả (hoặc mốc rỗng nếu không có dữ liệu).

### `/report/overview`
Params: `timezone`, `currency`.
- `assets` = Σ số dư **dương** của mọi account chưa xoá + Σ khoản `LEND` (đã cho mượn).
- `liabilities` = |Σ số dư **âm**| + Σ khoản `BORROW` (đang đi mượn).
- `netWorth = assets − liabilities`.
- `periods`: cố định 4 kỳ theo thứ tự `today` → `this_week` → `this_month` → `this_year`, mốc cắt theo `timezone`, mỗi kỳ có `income`/`expense`/`net`. `label` tiếng Việt lấy từ `src/lib/api/constants.ts`. Tuần bắt đầu từ **Thứ Hai**.

## 4. Edge case chung

| Tình huống | Kết quả |
|---|---|
| `dateFrom > dateTo` | `400 VALIDATION_ERROR`, `details.dateFrom` |
| `timezone` không hợp lệ | `400`, `details.timezone` |
| `currency` không hỗ trợ | `404 CURRENCY_NOT_SUPPORTED` |
| `accountId` / `categoryId` của user khác | `404`, `details.<field>` |
| User chưa có account nào | `total = "0.00"`, `accountCount = 0` — không lỗi |
| Kỳ không có giao dịch | `income`/`expense` = `"0.00"`, `transactionCount = 0`, `data: []` |
| `months = 0` hoặc `61` | `400` |
| Kỳ trải qua mốc đổi giờ (DST) | Vẫn cắt đúng theo IANA timezone |

## 5. Hạng mục

### Thêm file

- `src/app/api/report/total-balance/route.ts`
- `src/app/api/report/expense-vs-income/route.ts`
- `src/app/api/report/expense-by-category/route.ts`
- `src/app/api/report/expense-analysis/route.ts`
- `src/app/api/report/money-lend-borrow/route.ts`
- `src/app/api/report/overview/route.ts`
- `src/lib/services/report.service.ts` — một hàm cho mỗi endpoint, dùng chung `resolvePeriod()` và `resolveCurrency()`
- `src/lib/api/schemas/report.schema.ts` — schema zod dùng chung cho các param kỳ báo cáo

### Sửa file

- `src/lib/api/constants.ts` — thêm nhãn tiếng Việt cho 4 kỳ báo cáo và nhãn `"Chưa phân loại"`.

### Xóa file

- Không xoá file nào.

## 6. Test case

| # | Tình huống | Kỳ vọng |
|---|---|---|
| H1 | `/total-balance` với 3 account | `total` = tổng số dư quy đổi, `accountCount = 3` |
| H2 | `/total-balance` khi user chưa có account | `total = "0.00"`, `byCurrency: []` |
| H3 | `/total-balance?asOf=<quá khứ>` | Không tính giao dịch sau mốc |
| H4 | `/total-balance` với account VND + USD | `byCurrency` có 2 phần tử, số dư **gốc** chưa quy đổi |
| H5 | `/expense-vs-income` không truyền kỳ | `range` = tháng hiện tại theo `Asia/Ho_Chi_Minh` |
| H6 | Giao dịch lúc 23:30 ngày cuối tháng (giờ VN) | Nằm trong tháng đó, không rơi sang tháng sau |
| H7 | `/expense-vs-income` khi kỳ có TRANSFER | TRANSFER không cộng vào `income`/`expense` |
| H8 | `/expense-vs-income` khi kỳ có BORROW/LEND | Không cộng vào `income`/`expense` |
| H9 | `/expense-vs-income?accountId=` của user khác | `404` |
| H10 | `/expense-by-category` có chi tiêu ở danh mục con | Cộng vào danh mục **cha**, không có item nào `parentId != null` |
| H11 | `/expense-by-category` có giao dịch không danh mục | Có item `categoryId: null`, `name = "Chưa phân loại"` |
| H12 | `/expense-by-category` — tổng `percentage` | ≈ 100 (sai số làm tròn ≤ 0.05) |
| H13 | `/expense-by-category` khi kỳ rỗng | `data: []`, `totalAmount = "0.00"`, không lỗi chia 0 |
| H14 | `/expense-by-category?flow=INCOME` | Chỉ gom giao dịch INCOME |
| H15 | `/expense-by-category` phân trang | `meta.totalAmount` tính trên toàn bộ, không chỉ trang hiện tại |
| H16 | `/expense-analysis` mặc định | Đúng 6 phần tử, thứ tự cũ → mới, phần tử cuối = tháng hiện tại |
| H17 | `/expense-analysis` với tháng giữa không có giao dịch | Vẫn có phần tử, `income`/`expense` = `"0.00"` |
| H18 | `/expense-analysis?months=12` | 12 phần tử |
| H19 | `/expense-analysis?months=0` | `400` |
| H20 | `/expense-analysis?categoryId=<cha>` | Gồm cả giao dịch của danh mục con |
| H21 | `/money-lend-borrow` mặc định | Tối đa 5 item, sort `amount_desc`, không giới hạn thời gian |
| H22 | `/money-lend-borrow?kind=LEND` | Chỉ `kind = "LEND"` |
| H23 | `/money-lend-borrow` — `meta.totalLend`/`totalBorrow` | Tính trên toàn bộ kết quả, không chỉ 5 item trong trang |
| H24 | `/money-lend-borrow` với 2 currency | `amount` đã quy đổi về `range.currency`, sort đúng sau quy đổi |
| H25 | `/overview` | `periods` đúng 4 phần tử theo thứ tự `today` → `this_year` |
| H26 | `/overview` với thẻ tín dụng số dư âm | Số dư âm vào `liabilities`, không trừ vào `assets` |
| H27 | `/overview` sau 1 LEND 500 + 1 BORROW 200 | `assets` +500, `liabilities` +200 |
| H28 | `/overview` — `netWorth` | Đúng bằng `assets − liabilities` |
| H29 | `/overview` — kỳ `this_week` | Bắt đầu từ Thứ Hai theo `timezone` |
| H30 | Mọi endpoint với `timezone=Invalid/Zone` | `400`, `details.timezone` |
| H31 | Mọi endpoint không đăng nhập | `401 UNAUTHORIZED` |
| H32 | User A không thấy dữ liệu user B ở bất kỳ endpoint nào | Số liệu tách bạch hoàn toàn |

## 7. Checklist

- [x] Viết `src/lib/api/schemas/report.schema.ts`
- [x] Bổ sung nhãn kỳ báo cáo vào `src/lib/api/constants.ts`
- [x] Viết `resolvePeriod()` + `resolveCurrency()` trong `src/lib/services/report.service.ts`
- [x] Viết `getTotalBalance()` + route `/api/report/total-balance`
- [x] Viết `getExpenseVsIncome()` + route `/api/report/expense-vs-income`
- [x] Viết `getExpenseByCategory()` + route `/api/report/expense-by-category`
- [x] Viết `getExpenseAnalysis()` + route `/api/report/expense-analysis`
- [x] Viết `getMoneyLendBorrow()` + route `/api/report/money-lend-borrow`
- [x] Viết `getReportOverview()` + route `/api/report/overview`
- [x] Chạy `npm run lint` + `npm run build`
- [x] Chạy test script kiểm chứng H1–H32
