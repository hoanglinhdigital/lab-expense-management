# Plan: Màn hình Transaction History (Lịch sử giao dịch)

## Bối cảnh

Nút icon `lucide-rotate-ccw-clock` (component `History` của `lucide-react`) ở góc trái header màn Record (`RecordHeader.tsx`) hiện chỉ hiện notice "Tính năng đang phát triển". Task: bấm vào nút này điều hướng sang màn Transaction History.

Mockup liên quan: `docs/mockup/history/` — `history-1.png`, `history-2.png` (danh sách), `history-data-setting*.png` (bộ lọc kỳ), `history-expense-detail.png`, `history-income-detail.png` (chi tiết/sửa giao dịch).

Ngoài nút History ở Record, nút text "Transaction history" ở màn Home (`FlowSummaryCard.tsx:101`, nhận qua `onHistory` prop) hiện cũng chỉ hiện notice "đang phát triển" (`HomeScreen.tsx:97`) — cần điều hướng sang `/history` tương tự.

API đã có sẵn, không cần thêm API spec: `GET/POST /api/transactions`, `GET/PATCH/DELETE /api/transactions/{id}` (`docs/api-spec/transaction.yaml`). `GET /transactions` hỗ trợ `dateFrom`, `dateTo`, `page`, `pageSize`, trả kèm `meta.totalIncome/totalExpense`.

Phạm vi đã chốt với user: làm đầy đủ theo mockup, gồm cả bộ lọc kỳ (Data setting) và màn chi tiết/sửa/xoá giao dịch. Riêng icon Search và menu `⋮` trên header History: mockup không có màn đích cụ thể (không có mockup kết quả tìm kiếm / nội dung menu) nên giữ pattern có sẵn trong codebase (`FlowPeriodRow`, `ReportShortcutGrid`) — bấm vào hiện `FormAlert` "Tính năng đang phát triển".

## Kiến trúc tái sử dụng

Toàn bộ field con của form Record (`AmountField`, `AccountRow`, `DateTimeRow`, `DescriptionRow`, `CategoryPickerCard`, `AccountSheet`, `CategorySheet`, `ContactSheet`) và `record-types.ts`, `record-client.ts` dùng lại được cho màn chi tiết/sửa — chi tiết giao dịch (mọi `type`) tái dùng đúng bố cục 4 form hiện có (`ExpenseIncomeForm`, `TransferForm`, `BorrowLendForm`, `AdjustmentForm`) ở chế độ pre-filled + sửa, không viết lại field UI.

## Route mới

```
src/app/(main)/history/page.tsx                 → HistoryScreen (danh sách)
src/app/(main)/history/period/page.tsx           → HistoryPeriodScreen (Data setting)
src/app/(main)/history/[transactionId]/page.tsx  → TransactionDetailScreen (chi tiết/sửa/xoá)
```

Điều hướng: History screen giữ period đang chọn qua query string (`?range=month&from=...&to=...&label=This%20month`); Period screen đọc query hiện tại làm giá trị khởi tạo, khi chọn xong `router.replace` về `/history` với query mới.

## Thêm file

- [ ] `src/lib/history-types.ts` — types dùng chung: `PeriodRange` (`{kind, label, from, to}` với `kind: "date"|"week"|"month"|"quarter"|"custom"`), `TransactionListItem`, `TransactionGroup` (theo ngày), hàm build query cho `listTransactions`.
- [ ] `src/lib/history-client.ts` — `fetchTransactions(range, page)` gọi `GET /transactions`, map `TransactionDto` → `TransactionListItem`; `fetchTransactionDetail(id)` gọi `GET /transactions/{id}`; `updateTransaction(id, form, options)` gọi `PATCH`; `deleteTransaction(id)` gọi `DELETE`. Tái dùng `toAccountOption`/`toCategoryOption`/`toContactOption` logic tương tự `record-client.ts` (import trực tiếp các hàm map hiện có nếu export được, hoặc export thêm từ `record-client.ts`).
- [ ] `src/lib/period.ts` — hàm thuần tính range: `thisMonthRange()`, `lastMonthRange()`, `monthRange(year, month)`, `dayRange(date)`, `weekRange(date)` (Mon–Sun), `quarterRange(year, quarter)`, `customRange(from, to)`, `allTimeRange()`; mỗi hàm trả `{ from: Date, to: Date, label: string }`. Có test thủ công qua `npm run build` (không có test runner riêng trong project).
- [ ] `src/app/components/history/HistoryHeader.tsx` — back, title "Transaction history", search icon, menu `⋮` (đều gọi `onPlaceholder`).
- [ ] `src/app/components/history/PeriodSelectorButton.tsx` — nút "This month ›" hiển thị `label` hiện tại, điều hướng sang `/history/period`.
- [ ] `src/app/components/history/TransactionGroupList.tsx` — render danh sách nhóm theo ngày: header ngày (dd/mm/yyyy + thứ + tổng thu/chi trong ngày, màu xanh nếu dương/thu, đỏ nếu âm/chi — theo mockup mỗi ngày chỉ có 1 dấu, lấy dấu theo tổng net của ngày) + các dòng giao dịch (`TransactionRow`).
- [ ] `src/app/components/history/TransactionRow.tsx` — icon emoji (category/contact/transfer), tên, ghi chú phụ, số tiền màu theo hướng tiền (thu = xanh dương theo mockup thực tế dùng `text-blue-600`? — xem lại: mockup dùng đỏ cho expense, xanh dương (blue) cho income lớn, xanh lá cho "Side Job"/"Lương"... không đồng nhất theo type mà theo income/expense: expense đỏ, income xanh lá **hoặc** xanh dương tuỳ dòng — kiểm tra lại: dòng "Ăn trưa 688,000" xanh dương vì đó là **receiveAmount của Transfer** hiển thị dương; dòng "Transfer 500,000" xanh dương vì là transfer; "Ăn trưa 12,000" đỏ vì expense; "Side Job/Lương/Interest" xanh lá vì income. Quy tắc áp dụng: `EXPENSE` → đỏ (`text-rose-600`), `INCOME` → xanh lá (`text-emerald-600`), `TRANSFER/BORROW/LEND` → xanh dương (`text-blue-600`), khớp màu dùng trong `record-types.ts`'s `RECORD_TYPES` không có sẵn cho blue nên thêm accent riêng ở đây, không sửa `record-types.ts`), account/currency label với chấm tròn xám. `onClick` → `router.push(/history/{id})`.
- [ ] `src/app/components/history/HistoryScreen.tsx` — orchestrator: đọc `range` từ query (mặc định `thisMonthRange()`), fetch trang 1, "Load more" khi cuộn hết hoặc bấm nút, gộp nhóm theo ngày bằng `history-types.ts`, 3 trạng thái (loading skeleton / error + retry / empty "Chưa có giao dịch nào").
- [ ] `src/app/components/history/HistorySkeleton.tsx` — skeleton loading (giống pattern `RecordSkeleton`).
- [ ] `src/app/components/history/PeriodTabs.tsx` — 5 tab Date/Week/Month/Quarter/Custom (tái dùng style `FlowPeriodTabs`).
- [ ] `src/app/components/history/PeriodOptionRow.tsx` — 1 dòng lựa chọn (label + checkmark nếu đang chọn), dùng chung cho mọi tab.
- [ ] `src/app/components/history/DayCalendarModal.tsx` — modal chọn 1 ngày: header hiển thị ngày đang chọn, "Tháng/Năm ‹ ›" điều hướng tháng, lưới 7 cột (Mon–Sun) các ngày trong tháng (ngày ngoài tháng mờ, không bấm được), nút "Today" + "Done". Dùng chung cho "Select day" (Date tab) và "Select week" (Week tab — chọn 1 ngày rồi tự suy ra tuần chứa ngày đó) và "Select month" (tái dùng nhưng ẩn lưới ngày, thay bằng lưới 12 tháng — làm prop `mode: "day" | "month"`).
- [ ] `src/app/components/history/RangeCalendarModal.tsx` — modal chọn khoảng ngày (From/To) cho tab Custom: header "dd/mm/yyyy to dd/mm/yyyy" + nút xác nhận (✓), cùng lưới ngày như trên nhưng cho chọn 2 mốc (tap đầu = from, tap sau = to; tap trước from thì reset).
- [ ] `src/app/components/history/HistoryPeriodScreen.tsx` — orchestrator Data setting: quản lý tab đang chọn, danh sách preset theo tab, mở `DayCalendarModal`/`RangeCalendarModal` khi bấm "Select...", khi xác nhận → build `PeriodRange` từ `src/lib/period.ts` → `router.replace` về `/history?...`.
- [ ] `src/app/components/history/TransactionDetailScreen.tsx` — orchestrator chi tiết/sửa/xoá: fetch transaction theo id, map sang `RecordFormState` + `RecordOptions` (dùng lại `fetchRecordOptions()`), render đúng form con theo `type` (dùng lại `ExpenseIncomeForm`/`TransferForm`/`BorrowLendForm`/`AdjustmentForm` với `RecordFormProps`), header pill màu theo `getRecordTypeConfig` + nút back + nút ✓ (submit nhanh, alias của Save), 2 nút cuối Delete (mở `DeleteTransactionDialog`) / Save (PATCH), link "Show more details" và "Share" → placeholder giống `HistoryHeader`.
- [ ] `src/app/components/history/DeleteTransactionDialog.tsx` — modal xác nhận xoá, cùng cấu trúc với `LogoutConfirmDialog.tsx` (nút Hủy / Xoá màu rose, gọi `onConfirm` async, tự hiện lỗi nếu API fail).
- [ ] `src/app/(main)/history/page.tsx`
- [ ] `src/app/(main)/history/period/page.tsx`
- [ ] `src/app/(main)/history/[transactionId]/page.tsx`

## Sửa file

- [ ] `src/app/components/record/RecordScreen.tsx` — đổi `onHistory={() => setNotice(COMING_SOON)}` thành `onHistory={() => router.push("/history")}`.
- [ ] `src/app/components/home/HomeScreen.tsx` — đổi `onHistory={() => setNotice(COMING_SOON)}` (dòng 97, truyền cho `FlowSummaryCard`) thành `onHistory={() => router.push("/history")}`.
- [ ] `src/lib/record-client.ts` — export thêm `toAccountOption`, `toCategoryOption`, `toContactOption` (bỏ `function` riêng lẻ thành `export function`) để `history-client.ts` tái dùng, tránh trùng logic map DTO.

## Không sửa / không xoá

- Không đổi `docs/api-spec/transaction.yaml` (API đã đủ dùng).
- Không đổi `prisma/schema.prisma`.

## Logic xử lý & edge case

- **Group theo ngày**: sort theo `date desc` (API mặc định `date_desc`), gộp các transaction cùng ngày (theo giờ local) vào 1 group, tổng ngày = tổng có dấu (`INCOME/BORROW` +, `EXPENSE/LEND` −, `TRANSFER` không cộng vào tổng ngày vì trung tính giữa 2 ví — hiển thị màu blue riêng cho dòng nhưng không gộp vào subtotal ngày; subtotal ngày chỉ cộng amount của EXPENSE/INCOME/BORROW/LEND).
- **Phân trang**: nút "Xem thêm" ở cuối danh sách khi `meta.page * meta.pageSize < meta.total`; giữ nguyên các trang đã tải, nối thêm (không refetch từ đầu).
- **Rỗng**: hiển thị thông báo "Chưa có giao dịch nào trong kỳ này" + nút quay lại Record (giống pattern rỗng của `RecordScreen`/`ReportScreen`).
- **Period mặc định**: `thisMonthRange()` khi vào `/history` không có query.
- **Week range**: tuần bắt đầu Thứ 2 (Mon), kết thúc Chủ nhật (Sun), khớp header lưới `DayCalendarModal` (Mon → Sun theo mockup).
- **Quarter**: Q1 = Jan–Mar, Q2 = Apr–Jun, Q3 = Jul–Sep, Q4 = Oct–Dec của năm hiện tại (mockup không cho chọn năm cho Quarter — chỉ có 4 dòng cố định, mặc định năm hiện tại).
- **Custom "All time"**: gửi API không kèm `dateFrom`/`dateTo`.
- **TransactionDetailScreen validate**: tái dùng nguyên logic `validate()` hiện có trong `RecordScreen.tsx` (copy/adapt do khác action submit — PATCH thay vì POST); lỗi hiển thị qua `FormAlert` giống Record.
- **Xoá xong**: `router.replace("/history")` kèm giữ nguyên query range hiện tại (đọc từ `document.referrer`/`searchParams` truyền qua route) — đơn giản hoá bằng cách lưu range trong query khi vào `/history/[id]` (ví dụ `?from=/history?...`) hoặc đơn giản nhất: `router.back()` sau khi xoá/sửa thành công (giữ lịch sử điều hướng, không cần truyền query phức tạp). Chọn phương án `router.back()`.
- **Không hỗ trợ đổi `type`** trong màn chi tiết (khác với Record cho đổi type) — giữ `type` cố định, ẩn `TransactionTypeMenu`, chỉ hiển thị pill tĩnh đúng theo mockup (không có chevron đổi loại ở màn chi tiết).

## Test case cần kiểm tra thủ công sau khi code

- [ ] Bấm icon History ở Record → sang `/history`, mặc định lọc "This month".
- [ ] Bấm "Transaction history" ở Home → sang `/history`, mặc định lọc "This month".
- [ ] Danh sách hiển thị đúng nhóm theo ngày, subtotal ngày đúng dấu/màu.
- [ ] Bấm "This month ›" → sang Data setting, đổi qua các tab, chọn preset → quay lại History với danh sách đã lọc đúng khoảng ngày, label nút cập nhật đúng.
- [ ] Chọn "Select day/week/month" mở đúng calendar tương ứng, chọn ngày → áp dụng đúng range.
- [ ] Chọn "Custom" → "All time" bỏ lọc; chọn From/To bằng `RangeCalendarModal` → lọc đúng.
- [ ] Bấm 1 giao dịch EXPENSE và 1 INCOME → màn chi tiết hiển thị đúng theo mockup, sửa số tiền/danh mục/tài khoản/ngày giờ/note rồi Save → quay lại History thấy thay đổi.
- [ ] Bấm 1 giao dịch TRANSFER/BORROW/LEND → màn chi tiết dùng đúng form tương ứng, sửa & lưu được.
- [ ] Xoá 1 giao dịch → có xác nhận, xoá xong quay lại History không còn giao dịch đó.
- [ ] Icon Search / menu `⋮` trên History header → hiện thông báo "đang phát triển", không crash.
- [ ] `npm run build` và `npm run lint` pass.
