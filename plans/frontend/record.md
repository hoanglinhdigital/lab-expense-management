# Plan: Màn hình Record (nhập giao dịch) — frontend

Nguồn mockup: `docs/mockup/record/` (16 ảnh, đã đọc toàn bộ, không đọc lan sang mockup khác).

## 1. Phạm vi

Dựng màn hình `/record` với **6 loại giao dịch**: Expense · Income · Transfer · Borrow · Lend · Adjustment,
kèm toàn bộ luồng phụ trong mockup: chọn account, chọn category, tạo category mới (chọn icon, chọn
parent category), chọn contact, tạo contact mới.

**Không nằm trong phạm vi**: API thật, thay đổi `prisma/schema.prisma`, migration, màn hình History
(icon đồng hồ góc trái — chỉ render nút, bấm vào hiện thông báo "đang phát triển").

## 2. Quyết định thiết kế (đã chốt với user)

### 2.1 Bảng màu

Giữ đúng bảng màu của skill `frontend-coding`, **không thêm màu mới** dù mockup vẽ đỏ/lá/dương/tím/xám:

| Loại | Màu nhấn (số tiền, viền nút chọn loại) |
|---|---|
| Expense | `text-rose-600` / `border-rose-600` |
| Income | `text-emerald-600` / `border-emerald-600` |
| Transfer · Borrow · Lend · Adjustment | `text-slate-800` / `border-slate-300` |

Nút **Save** luôn là CTA chuẩn `bg-emerald-600 hover:bg-emerald-700` ở mọi loại giao dịch — CTA đồng nhất
toàn app quan trọng hơn việc đổi màu nút theo loại như mockup.

Map màu khai báo **một lần** trong `src/lib/record-types.ts` dưới dạng object literal có class đầy đủ
(không ghép chuỗi `text-${x}-600` vì Tailwind quét tĩnh).

### 2.2 Adjustment

`TransactionType` trong schema chưa có `ADJUSTMENT`. Task này **chỉ làm UI**, dùng type union phía
frontend `RecordType = TransactionType | 'ADJUSTMENT'`. Ghi chú lỗ hổng ở mục 6 để task backend bổ sung.

### 2.3 Nguồn dữ liệu

Chưa có `src/app/api/` và chưa có file nào trong `docs/api-spec/`. Theo đúng cách đã làm với auth
(`src/lib/auth-client.ts`), tạo `src/lib/record-client.ts` là **stub có độ trễ giả lập**: trả về danh
sách account / category / contact mẫu, và các hàm `createCategory` / `createContact` /
`saveTransaction`. Nhờ stub bất đồng bộ, ba trạng thái loading / empty / error là thật chứ không phải
dựng cảnh. Khi có API chỉ thay thân hàm, UI không phải sửa.

### 2.4 Điều hướng luồng phụ

Các màn hình phụ (Select Account, Select Category, Select Contact) là **bottom sheet**; các màn
"Add category", "Parent Category", "Icon" là **full-screen overlay** như mockup. Tất cả quản lý bằng
state trong `RecordScreen`, **không tạo route con** — người dùng đang nhập dở giao dịch mà đổi URL thì
mất hết dữ liệu form.

### 2.5 Responsive

Mobile-first, kiểm ở 375px. Từ `md:` trở lên: nội dung bọc `max-w-2xl mx-auto`; bottom sheet chuyển
thành dialog canh giữa; full-screen overlay giới hạn chiều rộng tương tự. Vùng bấm ≥ 44×44px.

## 3. Cấu trúc dữ liệu & luồng

### 3.1 Type (`src/lib/record-types.ts`)

- `RecordType`, `RECORD_TYPES` (label + màu + có/không có category, contact, tài khoản đích).
- `AccountOption { id, name, type, currency, balance, icon }`
- `CategoryOption { id, name, icon, type, parentId }`
- `ContactOption { id, name }`
- `RecordFormState { type, amount, categoryId, fromAccountId, toAccountId, contactId, date, time, note, receiveAmount, currentBalance, newBalance }`

### 3.2 Form theo từng loại

| Loại | Trường hiển thị |
|---|---|
| Expense / Income | Amount · Category (Most used + All) · Account · Date/Time · Description |
| Transfer | Amount · From account · To account · Amount receive + tỷ giá · Date/Time · Description |
| Borrow / Lend | Amount · Account · Contact · Date/Time · Description |
| Adjustment | Category · Account · Current amount (readonly) · New amount · Different (tính ra) · Date/Time · Description |

### 3.3 Validation

- `amount` > 0, chỉ nhận chữ số (lọc ký tự khi nhập), hiển thị có phân cách hàng nghìn.
- Expense/Income: bắt buộc `categoryId`, `fromAccountId`.
- Transfer: `fromAccountId ≠ toAccountId`; khác currency → hiện ô "Amount receive" + dòng tỷ giá.
- Borrow/Lend: bắt buộc `contactId`.
- Adjustment: `newBalance` khác `currentBalance`; `Different = newBalance − currentBalance`, hiển thị
  emerald khi dương, rose khi âm.
- Tên category/contact mới: bắt buộc, ≤ 50 ký tự, không trùng tên đã có (so sánh không phân biệt hoa thường).
- Lỗi hiển thị dưới field bằng `text-xs text-rose-600`, không dùng `alert()`.

### 3.4 Ba trạng thái

- **Loading**: skeleton `bg-slate-200 animate-pulse` đúng khối (thẻ amount, lưới Most used, hàng account).
- **Empty**: chưa có account → "Bạn chưa có tài khoản nào" + CTA sang `/account`; chưa có category →
  "Chưa có danh mục" + CTA "Thêm danh mục". Sheet category lọc không khớp → gợi ý xoá từ khoá.
- **Error**: thông báo tiếng Việt + nút "Thử lại" gọi lại đúng thao tác vừa fail (dùng lại `FormAlert`).

## 4. Hạng mục công việc

### Thêm file

**Lib**
- `src/lib/format.ts` — `formatCurrency`, `formatAmountInput`, `parseAmountInput`, `formatDateLabel` (Today/dd/MM/yyyy), `formatTime`.
- `src/lib/record-types.ts` — type + hằng số cấu hình 6 loại giao dịch (label, màu, field bật/tắt).
- `src/lib/record-client.ts` — stub bất đồng bộ: `fetchRecordOptions`, `createCategory`, `createContact`, `saveTransaction`.
- `src/lib/category-icons.ts` — danh sách emoji cho màn Icon (emoji ở đây là **dữ liệu category**, không phải icon giao diện).

**Component dùng chung** (`src/app/components/`)
- `BottomSheet.tsx` — sheet mobile / dialog từ `md:`; đóng bằng nút X, phím Esc, bấm nền.
- `FullScreenPanel.tsx` — overlay full màn có header back + tiêu đề.

**Component của Record** (`src/app/components/record/`)
- `RecordScreen.tsx` — client orchestrator: giữ state form, điều phối sheet/overlay, xử lý 3 trạng thái.
- `RecordHeader.tsx` — nút History + nút chọn loại giao dịch.
- `TransactionTypeMenu.tsx` — dropdown 6 loại.
- `AmountField.tsx` — ô nhập số tiền + mã tiền tệ.
- `CategoryPickerCard.tsx` — "Select category" + "Most used" (8 ô) + link "All".
- `CategoryTile.tsx` — một ô category (emoji + tên), có trạng thái được chọn.
- `AccountRow.tsx` — hàng chọn tài khoản (avatar chữ cái + tên + currency + chevron).
- `DateTimeRow.tsx` — ngày + giờ (`<input type="date">` / `type="time"`).
- `DescriptionRow.tsx` — ô ghi chú.
- `SaveButton.tsx` — CTA có trạng thái pending/disabled.
- `ExpenseIncomeForm.tsx`, `TransferForm.tsx`, `BorrowLendForm.tsx`, `AdjustmentForm.tsx`.
- `AccountSheet.tsx` — "Select Account": danh sách + số dư + dấu tick.
- `CategorySheet.tsx` — "Select Category": 2 tab Expense/Income, ô tìm kiếm, nhóm theo parent, FAB thêm mới.
- `ContactSheet.tsx` — "Chọn contact" + hàng "Tạo mới contact".
- `ContactCreateDialog.tsx` — dialog nhập tên contact (Hủy / Lưu).
- `CategoryFormPanel.tsx` — "Add expense/income category": icon + tên + parent (chỉ expense) + Save.
- `ParentCategoryPanel.tsx` — danh sách parent + "(No item selected)".
- `IconPickerPanel.tsx` — lưới emoji 4 cột.

### Sửa file

- `src/app/(main)/record/page.tsx` — thay `ScreenPlaceholder` bằng `<RecordScreen />`, thêm `metadata`.

### Xoá file

- Không xoá file nào.

## 5. Test case cần kiểm

- [x] Đổi loại giao dịch → form đổi đúng field, số tiền và màu nhấn đổi theo, dữ liệu đã nhập ở field chung (amount, account, date) được giữ.
- [x] Nhập `1234567` → hiển thị `1,234,567`; nhập chữ/ký tự lạ → bị loại bỏ.
- [x] Save khi thiếu category / account / contact → hiện lỗi đúng field, không gọi `saveTransaction`.
- [x] Transfer chọn cùng một tài khoản cho From và To → báo lỗi.
- [x] Transfer hai tài khoản khác currency → hiện ô "Amount receive" + dòng tỷ giá; cùng currency → ẩn.
- [x] Adjustment: `Different` tính đúng dấu và đúng màu (dương emerald, âm rose).
- [x] Tạo category mới → xuất hiện ngay trong sheet và được chọn sẵn; trùng tên → báo lỗi.
- [x] Tạo contact mới → xuất hiện ngay trong sheet và được chọn sẵn.
- [x] Tìm kiếm category không khớp → empty state gợi ý xoá từ khoá.
- [x] Sheet/overlay: đóng bằng Esc, bằng nút X, bằng bấm nền; focus trả về nút đã mở.
- [x] `fetchRecordOptions` fail → hiện lỗi + nút Thử lại gọi lại đúng hàm.
- [x] 375px: không cuộn ngang, lưới category 4 cột không tràn, bottom tab bar không che nút Save.

Đã kiểm thực tế trên trình duyệt ở 375px: Expense (validate thiếu số tiền), Transfer VND → USD
(tự quy đổi 3,000,000 VND = 114.00 USD + dòng tỷ giá), Borrow (tạo contact trùng tên bị chặn, tạo mới
được chọn sẵn, Save reset form), Adjustment (Different −5,113,000 màu rose), tạo category mới kèm chọn
icon và parent. Hàng "New Amount" của Adjustment lúc đầu tràn ngang ở 375px do input không co được
trong flex — đã sửa bằng `min-w-0` và thu hẹp cột nhãn.

## 6. Vấn đề tồn đọng (ngoài phạm vi plan này)

- `TransactionType` chưa có `ADJUSTMENT` → cần task backend bổ sung enum + migration.
- Chưa có API/spec cho record → `record-client.ts` là stub; cần task backend viết
  `docs/api-spec/` rồi thay thân hàm.
- Tỷ giá Transfer hiện là hằng số mẫu trong stub, chưa có nguồn tỷ giá thật.

## 7. Checklist

- [x] `src/lib/format.ts`
- [x] `src/lib/record-types.ts`
- [x] `src/lib/record-client.ts`
- [x] `src/lib/category-icons.ts`
- [x] `src/app/components/BottomSheet.tsx` + `FullScreenPanel.tsx`
- [x] `RecordScreen.tsx` + `RecordHeader.tsx` + `TransactionTypeMenu.tsx`
- [x] `AmountField.tsx` · `AccountRow.tsx` · `DateTimeRow.tsx` · `DescriptionRow.tsx` · `SaveButton.tsx`
- [x] `CategoryPickerCard.tsx` + `CategoryTile.tsx`
- [x] 4 form: ExpenseIncome · Transfer · BorrowLend · Adjustment
- [x] `AccountSheet.tsx` · `CategorySheet.tsx` · `ContactSheet.tsx` · `ContactCreateDialog.tsx`
- [x] `CategoryFormPanel.tsx` · `ParentCategoryPanel.tsx` · `IconPickerPanel.tsx`
- [x] Cập nhật `src/app/(main)/record/page.tsx`
- [x] `npm run lint` sạch
- [x] `npm run build` sạch
- [x] Rà `git diff` đúng phạm vi plan

## 8. Chênh lệch so với plan khi code

- `RecordFormProps` được khai báo thêm trong `src/lib/record-types.ts` (không tạo file mới) để 4
  component form dùng chung một "hợp đồng" props.
- `RecordScreen` tải dữ liệu bằng `useEffect` + callback của promise thay vì `async` helper, vì rule
  `react-hooks/set-state-in-effect` của React Compiler chặn setState đồng bộ trong effect. Nút "Thử
  lại" tăng `reloadToken` để chạy lại effect.
