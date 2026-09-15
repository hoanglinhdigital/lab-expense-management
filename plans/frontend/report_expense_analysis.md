# Plan Frontend — Màn "Expense Analysis" (tab Report)

Nguồn mockup: `docs/mockup/report/expense-analysis/` (5 ảnh, chỉ đọc đúng thư mục này).

- `expense-analysis-1.png` — màn chính: tab Day/Month/Year, nhãn kỳ ("9/2026"), donut + legend, danh
  sách danh mục cha (icon, %, số tiền, progress bar, chevron).
- `expense-analysis-2.png` — picker của tab **Month**: khoảng "MM/YYYY to MM/YYYY" + lưới 12 tháng.
- `expense-analysis-3.png` — màn chi tiết mở từ chevron: danh sách danh mục con (Cafe/Ăn trưa/Ăn sáng)
  dạng accordion, mở ra thấy từng giao dịch (ngày, số tiền, nguồn tiền).
- `expense-analysis-4.png` — picker của tab **Day**: khoảng ngày + lịch tháng, nút Today/Done.
- `expense-analysis-5.png` — picker của tab **Year**: khoảng năm + danh sách năm, nút Close/Done.

Chart/legend trong ảnh mockup (Chrome/IE/Firefox...) là placeholder mặc định của công cụ vẽ mockup —
**không phải nội dung thật**; dữ liệu thật là danh mục chi tiêu, lấy từ API.

## 1. Phạm vi

- Route mới `/report/expense-analysis` (màn chính — donut theo danh mục cha).
- Route mới `/report/expense-analysis/[categoryId]` (màn chi tiết — danh mục con + giao dịch), mở từ
  chevron của mỗi dòng danh mục cha.
- Sửa `ReportShortcutGrid`: ô "Expense analysis" điều hướng tới route trên thay vì hiện thông báo "đang
  phát triển" (3 ô còn lại giữ nguyên hành vi cũ).
- Bộ lọc thời gian linh động 3 chế độ **Day / Month / Year**, mỗi chế độ một kiểu picker riêng theo
  đúng mockup (mục 4).
- Dùng thật API `GET /report/expense-by-category` (có/không `parentId`) và `GET /transactions` —
  không dùng dữ liệu giả lập.

**Không nằm trong phạm vi**: sửa 3 ô lối tắt còn lại của `/report`, đổi cấu trúc `ReportScreen`, phân
trang danh sách giao dịch trong accordion (mockup không có phân trang — lấy tối đa theo `pageSize` mặc
định và hiển thị hết).

## 2. Điều hướng & state kỳ báo cáo (theo tiền lệ History)

Theo đúng cách `HistoryPeriodScreen` đang làm (`src/lib/history-types.ts`:
`rangeFromSearchParams`/`rangeToQuery`): kỳ báo cáo lưu ở **query string của URL**, không lưu ở state
cục bộ của component — nhờ vậy khi vào màn chi tiết rồi bấm quay lại, hoặc đổi kỳ từ màn chi tiết, kỳ
đang chọn không bị mất.

- `/report/expense-analysis?type=MONTH&from=2026-09-01&to=2026-09-30`
- `/report/expense-analysis/[categoryId]?type=MONTH&from=2026-09-01&to=2026-09-30`

Không truyền `type`/`from`/`to` → mặc định **Month, tháng hiện tại** (khớp trạng thái mặc định trong
mockup: tab Month sáng, nhãn "9/2026").

`src/lib/expense-analysis-types.ts` khai báo:

```ts
export type PeriodGranularity = "DAY" | "MONTH" | "YEAR";

export interface AnalysisPeriod {
  granularity: PeriodGranularity;
  from: Date;
  to: Date;
  /** Nhãn hiển thị cạnh 3 tab, vd "9/2026", "1/2026 - 9/2026", "2022-2026". */
  label: string;
}

export function periodFromSearchParams(params: URLSearchParams): AnalysisPeriod;
export function periodToQuery(period: AnalysisPeriod): Record<string, string>;
```

## 3. Bộ chọn kỳ (Day / Month / Year)

### 3.1 Hàng tab + nhãn

- `PeriodTypeTabs.tsx` (client): 3 nút Day/Month/Year, nút đang chọn nền `bg-amber-500/10` viền
  `border-amber-500`? — **không**, bảng màu dự án không có amber cho trạng thái chọn tab; dùng đúng quy
  ước hiện có của app (`text-emerald-600` + `border-emerald-600`, giống tab đang chọn ở
  `FlowPeriodTabs.tsx`). Đổi tab → đổi `type` trên URL, giữ nguyên khoảng đang chọn theo quy tắc mục
  3.4 (không tự ý đổi `from`/`to` nếu không cần).
- `PeriodRangeLabel.tsx` (client): nút hiển thị nhãn kỳ (vd "9/2026"), bấm mở modal picker tương ứng
  `type` hiện tại.

### 3.2 Tái sử dụng thay vì viết mới

- **Tab Day** → tái dùng nguyên `history/RangeCalendarModal.tsx` (đã có sẵn: lưới ngày trong tháng,
  click-click chọn from/to, nút Today/Done) — khớp gần đúng `expense-analysis-4.png`. Không viết
  modal ngày mới.
- **Tab Month** → viết mới `MonthRangeModal.tsx` vì chưa có picker range theo tháng. Cùng khung UI với
  `RangeCalendarModal` (dialog, nút Today/Done) nhưng lưới là **12 tháng của một năm** (giống chế độ
  `mode="month"` của `DayCalendarModal`), có chevron đổi năm, click-click chọn tháng bắt đầu/kết thúc
  (so sánh bằng `year * 12 + month`, cùng logic `pickDate`/`cellState` như `RangeCalendarModal`).
- **Tab Year** → viết mới `YearRangeModal.tsx`: lưới năm (3 cột) của một thập kỷ, chevron lùi/tiến 10
  năm, click-click chọn năm bắt đầu/kết thúc.

### 3.3 Hàm thuần dùng chung

Thêm vào `src/lib/period.ts` (chỉ thêm hàm mới, không sửa `PeriodKind`/`PeriodRange` hiện có — tránh
ảnh hưởng `HistoryPeriodScreen`):

```ts
export function monthSpanRange(
  fromYear: number, fromMonth: number, toYear: number, toMonth: number,
): { from: Date; to: Date; label: string };

export function yearSpanRange(
  fromYear: number, toYear: number,
): { from: Date; to: Date; label: string };
```

`monthSpanRange`/`yearSpanRange` với `from === to` trả nhãn 1 mốc ("9/2026", "2026"); khác nhau trả
"MM/YYYY - MM/YYYY" / "YYYY-YYYY" (khớp mockup). Tab Day tái dùng thẳng `customRange()` đã có (nhãn
"dd/mm/yyyy - dd/mm/yyyy"; nếu `from === to` rút gọn còn một mốc khi map sang `AnalysisPeriod.label`).

### 3.4 Quy tắc khi đổi tab

Đổi tab Day/Month/Year **không tự suy ra khoảng tương ứng** từ khoảng đang chọn (vd đang ở Month
09/2026 rồi bấm Year không tự nhảy năm 2026) — quá phức tạp và mockup không mô tả. Đổi tab → hiển thị
picker của tab đó với giá trị mặc định (Day: hôm nay; Month: tháng hiện tại; Year: năm hiện tại) trừ khi
đã từng chọn ở đúng tab đó trong phiên này thì giữ lại lựa chọn cũ. Đơn giản hoá: theo dõi lựa chọn của
cả 3 tab trong state của `ExpenseAnalysisScreen`/`ExpenseAnalysisDetailScreen`, chuyển tab chỉ đổi
`type` trên URL, không mở modal ngay (giữ đúng hành vi PeriodTabs hiện có của History — đổi tab chỉ đổi
danh sách lựa chọn hiển thị, không tự bật modal).

## 4. Màn chính `/report/expense-analysis`

### 4.1 Component

| File | Vai trò | Client? |
|---|---|---|
| `expense-analysis/ExpenseAnalysisScreen.tsx` | Điều phối: đọc kỳ từ URL, fetch, 3 trạng thái | ✅ |
| `expense-analysis/PeriodTypeTabs.tsx` | Tab Day/Month/Year | ✅ |
| `expense-analysis/PeriodRangeLabel.tsx` | Nút nhãn kỳ, mở đúng modal theo tab | ✅ |
| `expense-analysis/MonthRangeModal.tsx` | Picker tháng dạng khoảng | ✅ |
| `expense-analysis/YearRangeModal.tsx` | Picker năm dạng khoảng | ✅ |
| `expense-analysis/CategoryDonutChart.tsx` | Donut SVG + legend, nhận `items` qua props | ❌ |
| `expense-analysis/CategoryBreakdownList.tsx` | Danh sách danh mục cha (map `CategoryBreakdownRow`) | ❌ |
| `expense-analysis/CategoryBreakdownRow.tsx` | 1 dòng: icon, tên, %, số tiền, progress bar, chevron → `Link` tới `/report/expense-analysis/[id]` | ❌ |
| `expense-analysis/ExpenseAnalysisSkeleton.tsx` | Skeleton giữ bố cục donut + list | ❌ |

Ngưỡng tách: `ExpenseAnalysisScreen` < 150 dòng; `CategoryBreakdownRow` lặp ≥ 2 lần nên tách riêng.

### 4.2 Donut chart — không thêm thư viện

Dự án chưa có thư viện chart (`IncomeExpenseBars` cũng tự vẽ bằng div/CSS) → vẽ donut bằng **SVG thuần**
(`<circle>` với `stroke-dasharray`/`stroke-dashoffset` xoay dần theo % cộng dồn), không cài `recharts`
hay tương đương. Áp dụng hướng dẫn kỹ thuật của skill `dataviz` khi viết code (accessibility, tương
phản, trạng thái rỗng) ở bước Code.

### 4.3 Màu từng lát cắt — dữ liệu, không phải màu giao diện mới

Bảng màu cố định của skill `frontend-coding` (mục 2) áp cho **vai trò giao diện** (primary, income,
expense...), không áp cho màu nhận diện của từng category — category đã có sẵn field `color` (hex) do
seed/user đặt (`prisma/seed.ts`), y hệt cách `icon` (emoji) được coi là dữ liệu người dùng chứ không
phải icon chức năng. Vì vậy:

- Lấy màu lát cắt/progress bar/chấm legend từ `CategoryBreakdownItem.color` (API đã trả sẵn).
- `color = null` (danh mục "Chưa phân loại", hoặc category không đặt màu) → fallback `#94a3b8`
  (tương đương `slate-400`, đã có trong bảng màu dự án) — không bịa màu mới.
- Màu là dữ liệu động từ API nên **bắt buộc dùng inline `style`** cho `background`/`stroke` (đúng ngoại
  lệ nêu ở mục 1 của skill `frontend-coding`: giá trị chỉ tính được lúc runtime), không ghép class
  Tailwind động.

### 4.4 Dữ liệu

`src/lib/expense-analysis-client.ts`:

```ts
export interface CategoryBreakdownEntry {
  categoryId: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface CategoryBreakdown {
  items: CategoryBreakdownEntry[];
  totalAmount: number;
  currency: string;
}

export async function fetchCategoryBreakdown(
  period: AnalysisPeriod,
  parentId?: string,
): Promise<CategoryBreakdown>;
```

Gọi `GET /report/expense-by-category?dateFrom=&dateTo=&flow=EXPENSE[&parentId=]` qua `apiFetch` +
`buildQuery` (đúng khuôn `report-client.ts`/`history-client.ts` đang dùng), `pageSize` đặt đủ lớn (vd
`100`) vì donut cần hiển thị toàn bộ danh mục cùng lúc, không phân trang trên UI.

### 4.5 Ba trạng thái

| Trạng thái | Nội dung |
|---|---|
| Loading | `ExpenseAnalysisSkeleton` (khung donut tròn `animate-pulse` + 4 dòng list giả) |
| Empty | `totalAmount = 0` → "Chưa có chi tiêu nào trong kỳ này" + CTA "Ghi giao dịch" (`Link /record`) — tái đúng pattern `ExpenseAnalysisCard` ở Home |
| Error | `FormAlert tone="error"` + nút Thử lại gọi lại đúng fetch vừa fail |
| Unauthorized | `router.replace("/login")`, đúng pattern `ReportScreen` |

## 5. Màn chi tiết `/report/expense-analysis/[categoryId]`

### 5.1 Component

| File | Vai trò | Client? |
|---|---|---|
| `expense-analysis/ExpenseAnalysisDetailScreen.tsx` | Header quay lại + tên danh mục cha, tab kỳ (dùng lại `PeriodTypeTabs`/`PeriodRangeLabel`/2 modal ở mục 3), fetch breakdown con, 3 trạng thái | ✅ |
| `expense-analysis/CategoryChildAccordion.tsx` | Danh sách danh mục con dạng accordion (map `CategoryChildRow`) | ✅ |
| `expense-analysis/CategoryChildRow.tsx` | 1 danh mục con: icon, tên, tổng tiền, chevron xoay khi mở; khi mở lần đầu mới gọi API lấy giao dịch (lazy) | ✅ |
| `expense-analysis/CategoryTransactionRow.tsx` | 1 giao dịch: ngày, số tiền (rose), nguồn tiền | ❌ |
| `expense-analysis/ExpenseAnalysisDetailSkeleton.tsx` | Skeleton giữ bố cục header + list con | ❌ |

`categoryId` trong path chính là `parentId` gửi cho `GET /report/expense-by-category?parentId=`.

**Cập nhật lúc implement**: header lấy tên/icon danh mục cha qua `GET /categories/{categoryId}`
(`fetchCategorySummary`, gọi song song với `fetchCategoryBreakdown` bằng `Promise.all`) thay vì suy
từ response breakdown hoặc query `?name=` như dự kiến ban đầu — cách này đáng tin hơn vì response
breakdown **không** chắc có dòng `categoryId === parentId` (chỉ xuất hiện khi có giao dịch gắn thẳng
vào danh mục cha), trong khi `GET /categories/{id}` luôn trả đúng tên kể cả khi danh mục cha chưa có
giao dịch trực tiếp nào trong kỳ.

### 5.2 Hành vi accordion

- Mặc định **đóng tất cả** danh mục con.
- Bấm một dòng → mở, gọi `fetchCategoryTransactions(childId, period)`; bấm lần nữa → đóng (giữ dữ liệu
  đã tải, không gọi lại API khi mở lại lần 2 trong cùng phiên xem).
- Icon chevron: `ChevronDown` (đóng) / `ChevronUp` (mở) từ `lucide-react`, size 16, xoay bằng đổi icon
  (không dùng transform CSS phức tạp — đơn giản, dễ đọc).
- Dòng ứng với giao dịch gắn thẳng vào danh mục cha (`categoryId === parentId` trong response, xem plan
  backend mục 2.4) hiển thị **tên = tên danh mục cha**, icon = icon danh mục cha — người dùng hiểu đây
  là các khoản chưa gắn danh mục con.

### 5.3 Dữ liệu giao dịch trong accordion

`src/lib/expense-analysis-client.ts` thêm:

```ts
export interface CategoryTransactionItem {
  id: string;
  date: string;
  amount: number;
  currency: string;
  accountName: string;
  accountIcon: string | null;
  note: string | null;
}

export async function fetchCategoryTransactions(
  categoryId: string,
  period: AnalysisPeriod,
): Promise<CategoryTransactionItem[]>;
```

Gọi `GET /transactions?categoryId=<id>&dateFrom=&dateTo=&sort=date_desc&pageSize=100` (không
`includeChildCategories` — `categoryId` ở đây luôn là danh mục **lá** con hoặc chính danh mục cha khi
không có con, không cần gộp thêm). Map DTO giống `history-client.ts` (không import chéo, viết map
riêng gọn trong file này để không phụ thuộc `record-types`).

### 5.4 Ba trạng thái

| Trạng thái | Nội dung |
|---|---|
| Loading | `ExpenseAnalysisDetailSkeleton` |
| Empty (không có danh mục con nào có chi tiêu trong kỳ) | "Chưa có chi tiêu nào trong kỳ này cho danh mục này" + nút quay lại |
| Empty (một dòng con mở ra nhưng 0 giao dịch — hiếm, do lệch làm tròn) | Text nhỏ "Không có giao dịch" trong dòng, không cần CTA |
| Error | `FormAlert tone="error"` + Thử lại |
| `parentId` không hợp lệ / thuộc user khác (`404` từ API) | Thông báo "Không tìm thấy danh mục này." + nút quay lại `/report/expense-analysis` (không có nút Thử lại vì thử lại vẫn 404) |

## 6. Sửa `ReportShortcutGrid`

- `src/lib/report-types.ts`: thêm field optional `href?: string` vào `ReportShortcut`; đặt
  `href: "/report/expense-analysis"` cho item `"expense-analysis"`, 3 item còn lại không đổi.
- `src/app/components/report/ReportShortcutGrid.tsx`: item có `href` render bằng `Link`, item không có
  `href` giữ nguyên `button` gọi `onSelect` (thông báo "đang phát triển") như hiện tại.

## 7. Responsive & chi tiết UI

- Mobile-first, kiểm ở 375px; nội dung bọc `mx-auto w-full max-w-2xl`.
- Donut: `viewBox` vuông, chiều rộng tối đa theo container (`w-full max-w-64 mx-auto` ở mobile), legend
  xếp **dưới** donut dạng `flex flex-wrap gap-x-4 gap-y-2` (không đặt cạnh donut như mockup desktop —
  375px không đủ chỗ).
- Progress bar mỗi dòng danh mục: `h-1.5 rounded-full bg-slate-100`, phần đã chi `h-full rounded-full`
  màu theo `color` category (inline style, xem mục 4.3).
- Vùng bấm ≥ 44×44px: dòng danh mục cha/con, tab, nút picker.
- Số tiền `font-medium tabular-nums`, căn phải, âm/dương không áp dụng ở đây (luôn chi tiêu dương hiển
  thị màu `text-rose-600` theo đúng quy ước income/expense).
- Modal picker (Month/Year) dùng chung khung dialog `fixed inset-0 z-50` như `RangeCalendarModal` để 3
  loại picker trông nhất quán.

## 8. Test case cần kiểm bằng tay

- [ ] 375px: donut không tràn khung, legend wrap đúng, không cuộn ngang — **chưa kiểm được**: công cụ
      resize trình duyệt dùng để test không thu nhỏ được viewport render trong phiên này (chỉ thu nhỏ
      cửa sổ OS), đã kiểm ở màn hình rộng; code dùng đúng class mobile-first như các màn khác
      (`max-w-64`, `flex-wrap`, không `min-width` tĩnh) nhưng cần người dùng tự kiểm lại trên thiết bị
      thật hoặc DevTools trước khi coi là xong.
- [x] Vào `/report`, bấm ô "Expense analysis" → sang `/report/expense-analysis`, tab Report vẫn sáng.
- [x] Mặc định vào màn: tab Month sáng, nhãn = tháng hiện tại, donut hiển thị đúng dữ liệu tháng đó.
- [x] Đổi tab Day/Month/Year → đúng modal picker mở ra, chọn xong nhãn + donut + list cập nhật (đã kiểm
      Year: chọn khoảng 2024-2026, label + dữ liệu cập nhật đúng; Month/Day: mở picker đúng giao diện).
- [ ] Modal Month: chọn from tháng sau to (vd chọn Aug rồi Jun) → tự hoán đổi thành khoảng hợp lệ —
      chưa kiểm tay, logic sao chép đúng `pickDate`/`cellState` đã kiểm chứng của `RangeCalendarModal`.
- [x] Bấm chevron một danh mục cha → sang màn chi tiết đúng danh mục, giữ nguyên kỳ đang chọn.
- [x] Màn chi tiết: bấm một danh mục con → accordion mở, hiện đúng giao dịch (kiểm với danh mục con
      "Ăn sáng" và dòng gộp giao dịch gắn thẳng vào danh mục cha "Ăn uống").
- [x] Nút quay lại ở màn chi tiết → về đúng `/report/expense-analysis` với kỳ đã chọn được giữ nguyên.
- [ ] Trạng thái rỗng: chọn kỳ không có chi tiêu → đúng thông báo + CTA — chưa kiểm tay, logic dùng
      đúng pattern đã kiểm chứng của `ExpenseAnalysisCard`/`HistoryScreen`.
- [ ] Trạng thái lỗi: chặn API trả lỗi → thấy thông báo + Thử lại hoạt động đúng — chưa kiểm tay.
- [ ] `parentId` không hợp lệ (sửa tay URL) → thông báo "Không tìm thấy danh mục này." + nút quay lại —
      chưa kiểm tay.
- [ ] Bàn phím: tab qua được mọi tab/nút/dòng danh mục; `Escape` đóng modal picker — chưa kiểm tay.

## 9. Hạng mục thực hiện

### Thêm file

- [x] `src/lib/expense-analysis-types.ts`
- [x] `src/lib/expense-analysis-client.ts` (thêm cả `fetchCategorySummary` ngoài dự kiến ban đầu — xem
      ghi chú mục 5.1)
- [x] `src/app/components/report/expense-analysis/ExpenseAnalysisScreen.tsx`
- [x] `src/app/components/report/expense-analysis/PeriodTypeTabs.tsx`
- [x] `src/app/components/report/expense-analysis/PeriodRangeLabel.tsx`
- [x] `src/app/components/report/expense-analysis/MonthRangeModal.tsx`
- [x] `src/app/components/report/expense-analysis/YearRangeModal.tsx`
- [x] `src/app/components/report/expense-analysis/CategoryDonutChart.tsx`
- [x] `src/app/components/report/expense-analysis/CategoryBreakdownList.tsx`
- [x] `src/app/components/report/expense-analysis/CategoryBreakdownRow.tsx`
- [x] `src/app/components/report/expense-analysis/ExpenseAnalysisSkeleton.tsx`
- [x] `src/app/components/report/expense-analysis/ExpenseAnalysisDetailScreen.tsx`
- [x] `src/app/components/report/expense-analysis/CategoryChildAccordion.tsx`
- [x] `src/app/components/report/expense-analysis/CategoryChildRow.tsx`
- [x] `src/app/components/report/expense-analysis/CategoryTransactionRow.tsx`
- [x] `src/app/components/report/expense-analysis/ExpenseAnalysisDetailSkeleton.tsx`
- [x] `src/app/(main)/report/expense-analysis/page.tsx` (bọc thêm `Suspense` — `useSearchParams` bắt
      buộc phải có suspense boundary khi build, giống `history/page.tsx`)
- [x] `src/app/(main)/report/expense-analysis/[categoryId]/page.tsx` (tương tự, bọc `Suspense`)

### Sửa file

- [x] `src/lib/period.ts` — thêm `monthSpanRange`, `yearSpanRange`
- [x] `src/lib/report-types.ts` — thêm `href?: string` vào `ReportShortcut`
- [x] `src/app/components/report/ReportShortcutGrid.tsx` — render `Link` khi shortcut có `href`

### Xóa file

- Không có.

### Verify

- [x] `npm run lint`
- [x] `npm run build`
- [x] Rà `git diff` đúng phạm vi plan
- [x] Kiểm thực tế trên dev server: đăng ký user test, tạo account, tạo danh mục con qua màn Record,
      ghi giao dịch, xác nhận donut + list + drill-down + accordion + cả 3 picker Day/Month/Year hoạt
      động đúng, không có lỗi console. **Chưa kiểm được ở khung 375px thật** (giới hạn công cụ trong
      phiên này) — xem ghi chú mục 8.
