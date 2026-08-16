# Plan: Màn hình Home (dashboard) — frontend

Nguồn mockup: `docs/mockup/home/` (3 ảnh: `home-1.png`, `home-2.png`, `home-3.png` — đã đọc đủ 3, không đọc lan sang mockup khác).

## 1. Phạm vi

Dựng màn hình `/` (route `src/app/(main)/page.tsx`, hiện đang là `ScreenPlaceholder`) gồm 5 khối theo mockup:

1. **Header** — avatar chữ cái + "Hello! <tên user>" + thẻ **Total Balance** kèm nút con mắt ẩn/hiện số dư.
2. **Expense vs income** — biểu đồ cột đôi (Income / Expense) + 3 dòng số liệu (Income · Expense · Different) + biểu đồ donut tỷ trọng chi tiêu theo nhóm cha + nút **Transaction history**.
3. **Exchange rates utility** — danh sách tỷ giá (USD / EUR / JPY) + nút bánh răng + nút Search.
4. **Expense analysis** — biểu đồ cột theo tháng + bộ chọn khoảng thời gian (`01/2026 – 08/2026 ⌄`).
5. **Money lent/borrowed** — danh sách khoản cho mượn / đi mượn + link **View All**.

**Không nằm trong phạm vi**: API thật, sửa `prisma/schema.prisma`, migration, màn hình History (chưa có route `/history` — các nút "Transaction history", "View All", "Search", bánh răng chỉ hiện thông báo "đang phát triển"), và thư viện chart bên ngoài.

## 2. Quyết định thiết kế

### 2.1 Bảng màu

Mockup vẽ header và tab bar màu xanh dương, nhưng giữ đúng bảng màu skill `frontend-coding` như đã làm ở Record/Auth — **không thêm hue mới**:

| Thành phần trong mockup | Class thực dùng |
|---|---|
| Header xanh dương | `bg-emerald-600` (text trắng) |
| Cột/nhãn Income | `emerald-600` |
| Cột/nhãn Expense | `rose-600` |
| "Different" (xanh navy) | `text-slate-800`, đổi sang `text-rose-600` khi âm |
| Cột "Expense analysis" xanh dương | `fill-rose-600` (đây là dữ liệu chi tiêu → rose) |
| Link "View All" xanh dương | `text-emerald-600` |

**Điểm cần user xác nhận**: donut "tỷ trọng chi tiêu theo nhóm cha" cần **nhiều hơn 2 màu** khi user có > 2 nhóm cha. Đề xuất: dùng thang 5 màu **trong đúng các hue đã có** của bảng màu — `rose-600 · amber-500 · rose-400 · amber-300 · slate-400` — khai báo **một lần** trong `src/lib/home-types.ts` dưới dạng mảng class đầy đủ (không ghép chuỗi `text-${x}-600`). Nếu user muốn khác, đổi đúng mảng này là xong.

### 2.2 Chart — vẽ bằng SVG inline, không thêm dependency

Project chưa có thư viện chart. Ba chart ở đây đều đơn giản (2 cột, 1 donut, ~8 cột), nên viết bằng SVG inline trong component React thay vì kéo thêm `recharts`/`chart.js` — tránh tăng bundle trên thiết bị di động và tránh phải bọc `dynamic()`.

- Chiều rộng/cao cột tính theo `%` hoặc `viewBox` để chart co giãn theo container ở 375px.
- Chart có `role="img"` + `aria-label` mô tả số liệu; số liệu chi tiết luôn có bản text kèm bên cạnh (legend) nên người dùng screen reader không mất thông tin.
- Giá trị runtime (chiều cao cột, `stroke-dasharray` của donut) là ngoại lệ hợp lệ của rule "không inline style" — chỉ tính được lúc chạy.

### 2.3 Nguồn dữ liệu

Chưa có `src/app/api/` và `docs/api-spec/` chưa có spec cho home/dashboard. Theo đúng cách đã làm với `auth-client.ts` và `record-client.ts`: tạo `src/lib/home-client.ts` là **stub bất đồng bộ** (`fetchHomeOverview(range)`) trả dữ liệu mẫu khớp con số trong mockup. Nhờ vậy 3 trạng thái loading / empty / error là thật. Khi có API chỉ thay thân hàm.

### 2.4 Ẩn/hiện số dư

Nút con mắt trong mockup: toggle giữa số thật và `••••••••`. Trạng thái giữ trong state của `HomeScreen` (không lưu localStorage ở task này), mặc định **hiện**. Nút có `aria-label` đổi theo trạng thái ("Ẩn số dư" / "Hiện số dư") và icon `Eye` / `EyeOff`.

### 2.5 Responsive

Mobile-first, kiểm ở 375px. Nội dung bọc `mx-auto w-full max-w-2xl`. Từ `md:` các card giữ 1 cột (dữ liệu tài chính đọc theo chiều dọc dễ hơn), chỉ nới padding. Vùng bấm ≥ 44×44px. Nội dung chừa chỗ cho bottom tab bar (đã có `pb-20 md:pb-0` ở `(main)/layout.tsx`).

## 3. Cấu trúc dữ liệu & luồng

### 3.1 Type (`src/lib/home-types.ts`)

```ts
type PeriodRange = "3M" | "6M" | "12M" | "YTD";   // preset cho Expense analysis
interface UserSummary { name: string; }
interface BalanceSummary { total: number; currency: string; }
interface FlowSummary { income: number; expense: number; }      // different = income - expense
interface CategorySlice { id: string; name: string; amount: number; }
interface ExchangeRate { code: string; symbol: string; region: string; rate: number; }
interface MonthlyPoint { month: string; /* "2026-05" */ amount: number; }
interface LoanItem {
  id: string;
  kind: "LEND" | "BORROW";        // Loan / Borrowing
  note: string;
  amount: number;
  date: string;                    // "yyyy-MM-dd"
}
interface HomeOverview {
  user, balance, flow, expenseByCategory: CategorySlice[],
  exchangeRates: ExchangeRate[], monthly: MonthlyPoint[], loans: LoanItem[]
}
```

Kèm hằng số `DONUT_COLORS: string[]` (class fill đầy đủ) và `PERIOD_OPTIONS` (label + số tháng).

### 3.2 Luồng

- `HomeScreen` (client) tải `fetchHomeOverview(range)` trong `useEffect`, setState **chỉ trong callback của promise** (rule `react-hooks/set-state-in-effect` như đã gặp ở `RecordScreen`); nút "Thử lại" tăng `reloadToken`.
- Đổi khoảng thời gian ở "Expense analysis" → gọi lại `fetchHomeOverview` với `range` mới, chỉ khối biểu đồ tháng vào trạng thái loading cục bộ (skeleton của riêng card), các card khác giữ nguyên.
- Các nút chưa có màn đích (Transaction history, View All, Search, bánh răng) → set `notice` "Tính năng đang phát triển, vui lòng quay lại sau." hiển thị bằng `FormAlert tone="info"` (dùng lại component có sẵn).

### 3.3 Logic hiển thị

- `different = income − expense`; ≥ 0 → `text-slate-800`, < 0 → `text-rose-600`, luôn `font-medium tabular-nums`.
- Donut: `percent = amount / tổng amount`, làm tròn 2 chữ số thập phân như mockup (`50.98%`). Tổng bằng 0 → không vẽ donut, hiện empty state.
- Chart cột theo tháng: trục Y chia 5 mốc từ 0 đến `ceil(max)` làm tròn lên đơn vị triệu; nhãn trục X là số tháng 2 chữ số (`02`, `03`...). Đơn vị hiển thị "(Unit: Million)".
- Số tiền: `formatCurrency` từ `src/lib/format.ts` (đã có), hậu tố `đ` / mã tiền tệ; luôn `tabular-nums` + căn phải.
- LoanItem: `kind === "LEND"` → nhãn "Loan", số tiền `text-rose-600` (tiền đi ra); `kind === "BORROW"` → "Borrowing", `text-emerald-600` (tiền vào) — đúng như mockup home-3.
- Icon của loan dùng `lucide-react` (`HandCoins` / `PiggyBank`), **không dùng emoji** như mockup vì đây là icon giao diện chứ không phải icon category do user chọn.
- Ngày giao dịch hiển thị `dd/MM/yyyy` qua helper — bổ sung `formatDate(dateValue)` vào `src/lib/format.ts` (tách phần thân của `formatDateLabel` hiện có, không đổi hành vi hàm cũ).

### 3.4 Ba trạng thái

- **Loading**: `HomeSkeleton` — khối `bg-slate-200 animate-pulse` đúng hình dạng header, 4 card.
- **Empty** (mỗi card tự xử lý):
  - Chưa có giao dịch trong kỳ → "Chưa có giao dịch nào trong kỳ này" + CTA "Ghi giao dịch" (`Link` sang `/record`).
  - Không có khoản vay/cho mượn → "Chưa có khoản vay hoặc cho mượn nào" + CTA sang `/record`.
  - Không có tỷ giá → "Chưa có dữ liệu tỷ giá".
- **Error**: `FormAlert tone="error"` + nút "Thử lại" gọi lại đúng `fetchHomeOverview`.

## 4. Hạng mục công việc

### Thêm file

**Lib**
- `src/lib/home-types.ts` — type + `DONUT_COLORS` + `PERIOD_OPTIONS`.
- `src/lib/home-client.ts` — stub `fetchHomeOverview(range)` (có độ trễ giả lập, dữ liệu khớp mockup).

**Component Home** (`src/app/components/home/`)
- `HomeScreen.tsx` — client orchestrator: tải dữ liệu, 3 trạng thái, giữ state ẩn/hiện số dư + range + notice.
- `HomeHeader.tsx` — avatar + lời chào + thẻ Total Balance + nút con mắt.
- `BalanceCard.tsx` — thẻ trắng chứa nhãn "Total Balance", số dư, mã tiền tệ, nút toggle.
- `FlowSummaryCard.tsx` — card "Expense vs income": chart cột đôi + 3 dòng số liệu + donut + nút Transaction history.
- `IncomeExpenseBars.tsx` — SVG cột đôi + trục + legend.
- `CategoryDonut.tsx` — SVG donut + legend (tên nhóm + %).
- `ExchangeRateCard.tsx` — tiêu đề + nút bánh răng + nút Search + danh sách.
- `ExchangeRateRow.tsx` — một dòng tỷ giá (ký hiệu + mã + "1 USD ≈ 25.450 đ" + vùng).
- `ExpenseAnalysisCard.tsx` — tiêu đề + `PeriodMenu` + chart tháng (có skeleton cục bộ khi đổi kỳ).
- `MonthlyExpenseChart.tsx` — SVG cột theo tháng + lưới ngang + nhãn trục.
- `PeriodMenu.tsx` — nút chip mở dropdown chọn khoảng thời gian (đóng bằng Esc / bấm nền, theo mẫu `TransactionTypeMenu`).
- `LoanSummaryCard.tsx` — tiêu đề + link View All + danh sách.
- `LoanRow.tsx` — một dòng khoản vay (icon + nhãn + ghi chú + ngày + số tiền).
- `HomeSkeleton.tsx` — skeleton toàn màn.

### Sửa file

- `src/app/(main)/page.tsx` — thay `ScreenPlaceholder` bằng `<HomeScreen />`, thêm `metadata`.
- `src/lib/format.ts` — thêm `formatDate(dateValue)` (dd/MM/yyyy) và dùng lại trong `formatDateLabel`.

### Xoá file

- Không xoá file nào.

## 5. Test case cần kiểm

- [x] Bấm nút con mắt → số dư đổi thành `••••••••` và ngược lại; `aria-label` đổi theo trạng thái.
- [x] `different` dương hiển thị `text-slate-800`, âm hiển thị `text-rose-600`, có phân cách hàng nghìn.
- [x] Donut: tổng % xấp xỉ 100, legend khớp màu từng lát; chỉ có 1 nhóm → vẽ vòng đầy đủ, không lỗi.
- [x] Đổi khoảng thời gian ở "Expense analysis" → chỉ card đó vào skeleton, dữ liệu chart đổi theo, các card khác không nhấp nháy.
- [x] Dropdown khoảng thời gian đóng được bằng Esc, bằng bấm nền; focus trả về nút đã mở.
- [x] `fetchHomeOverview` fail → hiện lỗi tiếng Việt + nút "Thử lại" gọi lại đúng hàm.
- [x] Dữ liệu rỗng (không giao dịch / không khoản vay) → đúng empty state kèm CTA sang `/record`.
- [x] Loan: LEND hiển thị "Loan" màu rose, BORROW hiển thị "Borrowing" màu emerald, ngày đúng `dd/MM/yyyy`.
- [x] "Transaction history" / "View All" / "Search" / bánh răng → hiện thông báo đang phát triển, không điều hướng lỗi.
- [x] 375px: không cuộn ngang; chart co vừa khung; số tiền dài (3,200,120,050) không tràn thẻ Total Balance; bottom tab bar không che nội dung cuối trang.
- [x] `npm run lint` và `npm run build` sạch.

Đã kiểm thực tế trên trình duyệt ở 375px: trạng thái ready (đủ 5 khối, số liệu khớp mockup), ẩn/hiện
số dư, đổi kỳ 6M → 12M (chart đổi từ 03–08/2026 sang 09/2025–08/2026), bấm "Transaction history" hiện
thông báo đang phát triển, trạng thái error (stub throw → alert + nút Thử lại) và trạng thái empty
(stub trả mảng rỗng → 3 empty state kèm CTA "Ghi giao dịch"). Ban đầu tên nhóm trong legend donut bị
cắt và số tiền khoản vay canh giữa lệch so với mockup — đã sửa bằng cho tên xuống dòng, thu donut còn
`size-28` và canh số tiền `self-start`.

## 6. Vấn đề tồn đọng (ngoài phạm vi plan này)

- Chưa có API/spec cho dashboard → `home-client.ts` là stub; cần task backend viết `docs/api-spec/` (gợi ý: `GET /api/home/overview?range=`) rồi thay thân hàm.
- Chưa có route `/history` → các nút liên quan tạm hiện thông báo.
- Nguồn tỷ giá thật chưa có (giống ghi chú ở `record.md`).
- Tên user đang lấy từ stub, chưa có session thật.

## 7. Checklist

- [x] `src/lib/home-types.ts`
- [x] `src/lib/home-client.ts`
- [x] `src/lib/format.ts` — thêm `formatDate`
- [x] `HomeScreen.tsx` + `HomeSkeleton.tsx`
- [x] `HomeHeader.tsx` + `BalanceCard.tsx`
- [x] `FlowSummaryCard.tsx` + `IncomeExpenseBars.tsx` + `CategoryDonut.tsx`
- [x] `ExchangeRateCard.tsx` + `ExchangeRateRow.tsx`
- [x] `ExpenseAnalysisCard.tsx` + `MonthlyExpenseChart.tsx` + `PeriodMenu.tsx`
- [x] `LoanSummaryCard.tsx` + `LoanRow.tsx`
- [x] Cập nhật `src/app/(main)/page.tsx`
- [x] `npm run lint` sạch
- [x] `npm run build` sạch
- [x] Rà `git diff` đúng phạm vi plan

## 8. Chênh lệch so với plan khi code

- Hai chart cột (`IncomeExpenseBars`, `MonthlyExpenseChart`) cuối cùng dựng bằng **div + Tailwind**
  thay vì SVG như plan mục 2.2 — cột chỉ là hình chữ nhật nên div gọn hơn và tự co theo container;
  chỉ `CategoryDonut` thật sự cần SVG (`stroke-dasharray`). Phần "giá trị runtime là ngoại lệ hợp lệ
  của rule không inline style" vẫn giữ nguyên tinh thần: chỉ chiều cao cột và độ dài cung là động.
- `PeriodRange` bỏ preset `YTD`, còn `3M / 6M / 12M` — nhãn trên chip đã hiển thị đúng khoảng
  `MM/yyyy – MM/yyyy` nên thêm YTD chỉ làm rối menu.
- `PeriodMenu` tự giữ state đóng/mở bên trong (không đẩy lên `HomeScreen`) vì không có overlay nào
  khác của Home cần biết trạng thái này.
- `CategoryDonut` tính điểm bắt đầu mỗi cung bằng `reduce` trên các lát đứng trước thay vì biến cộng
  dồn — rule `react-hooks/immutability` của React Compiler chặn gán lại biến trong lúc render.
- Trạng thái lỗi khi **đã có dữ liệu** (đổi kỳ bị fail) hiện `FormAlert` ở đầu danh sách card thay vì
  thay cả màn hình, để người dùng không mất phần dữ liệu đang xem.
