# Plan: Màn hình Report + màn chi tiết "Expense vs Income" — frontend

Nguồn mockup: `docs/mockup/report/` (2 ảnh: `report-1.png` = màn Report chính, `report-current.png`
= màn chi tiết mở từ link "View detail"). Chỉ đọc đúng thư mục này.

## 1. Phạm vi

Dựng route `/report` (hiện là `ScreenPlaceholder`) và route con `/report/expense-vs-income`:

**`/report` (theo `report-1.png`)**

- Tiêu đề trang "Report".
- Card **Financial statement**: tổng tài sản ròng + 2 ô con **Assets** / **Liabilities**.
- Card **Expense vs income**: link "View detail", biểu đồ 2 cột thu/chi, 3 dòng Income / Expense /
  Different.
- Lưới 2×2 các lối tắt: **Expense analysis**, **Income analysis**, **Money lent/borrowed**,
  **Payer/Payee**.

**`/report/expense-vs-income` (theo `report-current.png`)**

- Header có nút quay lại + tiêu đề "Expense vs Income".
- Tab kỳ: **Current · Month · Quarter · Year · Custom**.
- Dòng phụ có icon lịch: "In 2026" (phạm vi dữ liệu đang xem).
- Danh sách 5 dòng: Today / This week / This month / This quarter / This year — mỗi dòng 3 số:
  income (emerald), expense (rose, có chevron `›`), net = income − expense.

**Không nằm trong phạm vi**: API thật, sửa `prisma/schema.prisma`, migration, 4 màn đích của lưới
lối tắt (mockup chưa có), màn danh sách giao dịch mở từ chevron `›`, nội dung 4 tab Month / Quarter /
Year / Custom (mockup chỉ có tab Current).

## 2. Quyết định thiết kế

### 2.1 Bảng màu

Mockup vẽ xanh dương; giữ đúng bảng màu skill `frontend-coding` như các màn đã làm, **không thêm màu**:

| Thành phần trong mockup | Class dùng thật |
|---|---|
| Card "Financial statement" nền xanh dương | `bg-emerald-600` + chữ trắng, 2 ô con `bg-white/15` |
| Link "View detail", icon lối tắt | `text-emerald-600` |
| Cột income / số income | `bg-emerald-600` / `text-emerald-600` |
| Cột expense / số expense | `bg-rose-600` / `text-rose-600` |
| Different / net | `text-slate-800`, âm thì `text-rose-600` |
| Tab đang chọn | `text-emerald-600` + gạch chân `border-emerald-600` |

### 2.2 Điều hướng

- Trong mockup `report-current.png` **bottom tab bar vẫn hiển thị và tab Report vẫn sáng** → màn chi
  tiết là **route con** `/report/expense-vs-income` (nằm trong `(main)/layout.tsx`), không phải
  overlay `FullScreenPanel`. `isNavItemActive` đã dùng `startsWith` nên tab Report tự sáng.
- Nút quay lại: `Link href="/report"` (không dùng `router.back()` để vào thẳng bằng URL vẫn đúng).

### 2.3 Hành vi chưa được mockup mô tả

Theo tiền lệ ở `HomeScreen` / `AccountScreen`: hiện `FormAlert tone="info"` với nội dung
"Tính năng đang phát triển, vui lòng quay lại sau." cho:

- 4 ô lối tắt (Expense analysis, Income analysis, Money lent/borrowed, Payer/Payee).
- Chevron `›` ở mỗi dòng kỳ trong màn chi tiết.
- Tab Month / Quarter / Year / Custom (chỉ tab Current có mockup) — tab vẫn đổi trạng thái chọn để
  người dùng thấy đã bấm trúng, nhưng nội dung hiện thông báo thay vì tự chế dữ liệu.

### 2.4 Nguồn dữ liệu

`docs/api-spec/` vẫn trống, chưa có `src/app/api/`. Làm đúng như `home-client.ts` / `account-client.ts`:
tạo `src/lib/report-client.ts` là **stub bất đồng bộ** có độ trễ giả lập, kiểu trả về ổn định để khi
có API chỉ thay thân hàm (gợi ý: `GET /api/report/overview`, `GET /api/report/flow-summary`). Nhờ
stub bất đồng bộ, 3 trạng thái loading / empty / error là thật.

Số liệu mẫu lấy khớp mockup: financial statement 3.200.000.000 (assets 1.900.000.000, liabilities
1.300.000.000); flow income 20.000.000 / expense 12.000.000; các dòng kỳ theo `report-current.png`
(Today 0/0, This week & month & quarter 0/510.000, This year 72.689.000/8.302.200).

### 2.5 Tái sử dụng

- **Dùng lại `home/IncomeExpenseBars.tsx`** cho biểu đồ 2 cột (khớp mockup, cùng cặp màu, cùng kiểu
  dữ liệu `FlowSummary` của `home-types`) — không viết lại biểu đồ mới.
- Dùng lại `FormAlert`, `formatCurrency` trong `src/lib/format.ts`.
- Không sửa `home-types.ts`; `report-types.ts` import `FlowSummary` từ đó để hai màn dùng chung một
  "hợp đồng" thu/chi.

### 2.6 Responsive

Mobile-first, kiểm ở 375px. Nội dung bọc `mx-auto w-full max-w-2xl`. Lưới lối tắt `grid-cols-2`.
Vùng bấm ≥ 44×44px (ô lối tắt, tab, dòng kỳ). Hàng tab cuộn ngang được (`overflow-x-auto`) để 5 tab
không vỡ ở 375px, nhưng nội dung chính không cuộn ngang. Số tiền `font-medium tabular-nums`, căn phải.

## 3. Cấu trúc dữ liệu

### 3.1 `src/lib/report-types.ts`

- `FinancialStatement { netWorth, assets, liabilities, currency }`
- `PeriodTab = "CURRENT" | "MONTH" | "QUARTER" | "YEAR" | "CUSTOM"`
- `PERIOD_TABS: { value: PeriodTab; label: string }[]` — thứ tự = thứ tự hiển thị.
- `PeriodFlow { id, label, income, expense }` — `net` tính khi render (`income - expense`).
- `ReportOverview { statement, flow: FlowSummary }` (`FlowSummary` import từ `home-types`)
- `FlowDetail { scopeLabel, currency, periods: PeriodFlow[] }`
- `ReportShortcut { id, label, icon: LucideIcon }` — 4 ô lưới, icon `lucide-react`:
  `TrendingUp` · `TrendingDown` · `ListOrdered` · `CircleUserRound`.

### 3.2 `src/lib/report-client.ts`

- `fetchReportOverview(): Promise<ReportOverview>`
- `fetchFlowDetail(tab: PeriodTab): Promise<FlowDetail>` — chỉ `CURRENT` có dữ liệu, các tab khác trả
  `periods: []` để màn hiển thị trạng thái "đang phát triển".

## 4. Component

| File | Vai trò | Client? |
|---|---|---|
| `report/ReportScreen.tsx` | Điều phối màn `/report`: fetch, notice, 3 trạng thái | ✅ |
| `report/FinancialStatementCard.tsx` | Card net worth + Assets / Liabilities | ❌ |
| `report/ExpenseIncomeCard.tsx` | Card Expense vs income + link View detail + `IncomeExpenseBars` | ❌ |
| `report/ReportShortcutGrid.tsx` | Lưới 2×2 lối tắt (map `ReportShortcut`) | ✅ |
| `report/ReportSkeleton.tsx` | Skeleton giữ đúng bố cục `/report` | ❌ |
| `report/FlowDetailScreen.tsx` | Điều phối màn chi tiết: tab, fetch theo tab, 3 trạng thái | ✅ |
| `report/FlowPeriodTabs.tsx` | Hàng tab Current…Custom, cuộn ngang | ✅ |
| `report/FlowPeriodRow.tsx` | 1 dòng kỳ: nhãn + income / expense (chevron) / net | ✅ |
| `report/FlowDetailSkeleton.tsx` | Skeleton giữ đúng bố cục màn chi tiết | ❌ |

Ngưỡng tách: `ReportScreen` và `FlowDetailScreen` đều < 150 dòng; khối card / dòng kỳ lặp ≥ 2 lần nên
tách riêng.

## 5. Logic & xử lý lỗi

- `net = income − expense`; net < 0 → `text-rose-600`, ngược lại `text-slate-800`. Income luôn
  emerald, expense luôn rose kể cả khi bằng 0.
- Tab đổi → gọi lại `fetchFlowDetail`, giữ khung tab hiển thị (không nháy cả màn), phần danh sách
  chuyển sang skeleton.
- Lỗi fetch → `FormAlert tone="error"` + nút Thử lại gọi lại đúng thao tác vừa fail (`reloadToken`).
- Không dùng `any`; props khai báo bằng `interface <Ten>Props`.
- Hiệu ứng fetch viết theo đúng khuôn đã dùng ở `HomeScreen` (cờ `cancelled`, `setState` chỉ trong
  callback của promise — tránh cảnh báo `react-hooks/set-state-in-effect`).

## 6. Ba trạng thái màn hình

| Màn | Loading | Empty | Error |
|---|---|---|---|
| `/report` | `ReportSkeleton` | Chưa có giao dịch → "Chưa có dữ liệu báo cáo" + CTA "Ghi giao dịch" (`Link /record`) | "Không tải được dữ liệu báo cáo." + Thử lại |
| `/report/expense-vs-income` | `FlowDetailSkeleton` | Tab chưa có dữ liệu → thông báo "Tính năng đang phát triển…"; kỳ có 0 giao dịch vẫn hiện dòng số 0 đúng như mockup | "Không tải được số liệu thu chi." + Thử lại |

## 7. Test case cần kiểm bằng tay

- [x] 375px: không cuộn ngang, số tiền dài (3.200.000.000) không tràn/không bị cắt.
- [x] Tab bar không che nội dung cuối trang (`pb-20` từ layout).
- [x] Vào `/report`, bấm "View detail" → sang `/report/expense-vs-income`, tab Report vẫn sáng.
- [ ] Nút quay lại → về `/report`; vào thẳng URL chi tiết vẫn hiển thị đúng.
- [x] Đổi tab Month/Quarter/Year/Custom → tab đổi trạng thái chọn, nội dung hiện thông báo đang phát triển.
- [x] Dòng kỳ: net âm hiện màu rose, net dương/0 hiện slate; các cột số thẳng hàng (`tabular-nums`).
- [x] Chevron `›` hiện thông báo "đang phát triển" (4 ô lối tắt: chưa kiểm bằng tay).
- [ ] Trạng thái error: chặn stub trả lỗi → thấy thông báo + Thử lại gọi lại được.
- [ ] Bàn phím: tab focus được mọi nút, ô lối tắt ≥ 44×44px.

## 8. Hạng mục thực hiện

### Thêm file

- [x] `src/lib/report-types.ts`
- [x] `src/lib/report-client.ts`
- [x] `src/app/components/report/ReportScreen.tsx`
- [x] `src/app/components/report/FinancialStatementCard.tsx`
- [x] `src/app/components/report/ExpenseIncomeCard.tsx`
- [x] `src/app/components/report/ReportShortcutGrid.tsx`
- [x] `src/app/components/report/ReportSkeleton.tsx`
- [x] `src/app/components/report/FlowDetailScreen.tsx`
- [x] `src/app/components/report/FlowPeriodTabs.tsx`
- [x] `src/app/components/report/FlowPeriodRow.tsx`
- [x] `src/app/components/report/FlowDetailSkeleton.tsx`
- [x] `src/app/(main)/report/expense-vs-income/page.tsx`

### Sửa file

- [x] `src/app/(main)/report/page.tsx` — render `ReportScreen` thay `ScreenPlaceholder`

### Xóa file

- (không có)

### Verify

- [x] `npm run lint` sạch
- [x] `npm run build` sạch
- [x] Rà `git diff` đúng phạm vi plan
- [x] Kiểm thực tế ở 375px trên dev server theo mục 7 (trừ 3 mục còn để trống)
