# Plan: Màn hình Account (danh sách tài khoản) — frontend

Nguồn mockup: `docs/mockup/account/` (4 ảnh: `account-1.png`, `account-create-account.png`,
`account-create-account-select-account-type.png`, `account-create-account-select-currency.png`).
Chỉ đọc đúng thư mục này, không đọc lan sang mockup khác.

## 1. Phạm vi

Dựng màn hình `/account` (hiện đang là `ScreenPlaceholder`) gồm:

- Header "My account" + card **Total balance** có nút ẩn/hiện số dư và nút `+` thêm tài khoản.
- Card nhóm **"Spending account (n)"** chứa danh sách tài khoản (avatar chữ cái, tên, số dư, nút `⋮`).
- Overlay **Add Account** (full-screen): initial balance, account name, account type, currency, description.
- Bottom sheet **Account type** và bottom sheet **Currency**.

**Không nằm trong phạm vi**: API thật, sửa `prisma/schema.prisma`, migration, màn hình sửa/xoá tài
khoản (mockup không có), màn chi tiết nhóm tài khoản.

## 2. Quyết định thiết kế

### 2.1 Bảng màu

Mockup vẽ nền xanh dương và avatar nhiều màu (tím/lam/lục/đỏ). Giữ đúng bảng màu của skill
`frontend-coding` như các màn đã làm (auth, home, record), **không thêm màu mới**:

| Thành phần trong mockup | Class dùng thật |
|---|---|
| Header xanh dương | `bg-emerald-600` (giống `HomeHeader`) |
| Card total balance | `bg-white` + `text-slate-800` |
| Avatar tròn nhiều màu | `bg-slate-100 text-slate-800` (giống `record/AccountSheet`) |
| Nút `+`, nút Save, số/ký hiệu tiền tệ nhấn xanh dương | `bg-emerald-600` / `text-emerald-600` |

### 2.2 Hành vi chưa được mockup mô tả

- Nút `⋮` mỗi dòng tài khoản: mockup không có ảnh menu mở ra. Theo tiền lệ ở `HomeScreen`, nút này
  hiện thông báo `FormAlert tone="info"` "Tính năng đang phát triển, vui lòng quay lại sau." — không
  tự chế luồng sửa/xoá.
- Chevron `>` ở tiêu đề nhóm: không có màn đích trong mockup → dùng làm nút **thu gọn/mở rộng** nhóm
  (chevron xoay 90°), là tương tác thật và không cần màn hình mới.
- Nút `✓` ở header Add Account: submit form, cùng hành vi với nút **Save** ở cuối.

### 2.3 Account type & Currency

- Mockup liệt kê đúng 4 loại: Cash · Bank · Card · E-Wallet → map sang enum `AccountType` của Prisma:
  `CASH` · `BANK_ACCOUNT` · `CREDIT_CARD` · `E_WALLET`. Các giá trị enum còn lại
  (`SAVING_ACCOUNT`, `IC_CARD`, `INVESTMENT`, `OTHER`) **ngoài phạm vi** task này.
- Currency lấy đúng 9 mã trong mockup: VND(đ) · USD($) · EUR(€) · JPY(¥) · GBP(£) · SGD(S$) ·
  AUD(A$) · CAD(C$) · CNY(¥). Mặc định VND.

### 2.4 Nguồn dữ liệu

Chưa có `src/app/api/` và `docs/api-spec/` vẫn trống. Theo đúng cách đã làm ở `auth-client.ts`,
`home-client.ts`, `record-client.ts`: tạo `src/lib/account-client.ts` là **stub bất đồng bộ** có độ
trễ giả lập, giữ tài khoản vừa tạo trong bộ nhớ suốt phiên. Khi có API chỉ thay thân hàm, UI không
phải sửa. Nhờ stub bất đồng bộ, 3 trạng thái loading / empty / error là thật.

### 2.5 Điều hướng & responsive

- Add Account là **full-screen overlay** (`FullScreenPanel` sẵn có), Account type / Currency là
  **bottom sheet** (`BottomSheet` sẵn có). Tất cả quản lý bằng state trong `AccountScreen`, không tạo
  route con — đang nhập dở form mà đổi URL thì mất dữ liệu.
- Mobile-first, kiểm ở 375px; từ `md:` nội dung bọc `mx-auto max-w-2xl`. Vùng bấm ≥ 44×44px.
- Số tiền: `font-medium tabular-nums`, phân cách hàng nghìn qua `formatCurrency` trong `src/lib/format.ts`.

## 3. Cấu trúc dữ liệu

### 3.1 `src/lib/account-types.ts`

- `AccountKind = "CASH" | "BANK_ACCOUNT" | "CREDIT_CARD" | "E_WALLET"`
- `ACCOUNT_KINDS: { value: AccountKind; label: string }[]` — thứ tự = thứ tự trong sheet.
- `CURRENCIES: { code: string; symbol: string }[]`; `currencySymbol(code): string`.
- `AccountItem { id, name, kind, currency, balance, description }`
- `AccountGroup { id, title, accounts: AccountItem[] }`
- `AccountOverview { totalBalance, currency, groups }`
- `AccountFormState { balance, name, kind, currency, description }` (balance là chuỗi số thô)
- `AccountFieldErrors = Partial<Record<"name" | "balance", string>>`
- `accountInitial(name): string` — chữ cái đầu cho avatar.

### 3.2 `src/lib/account-client.ts`

- `fetchAccountOverview(): Promise<AccountOverview>` — 6 tài khoản mẫu khớp mockup.
- `createAccount(input): Promise<AccountItem>` — thêm vào state trong bộ nhớ.

## 4. Component

| File | Vai trò | Client? |
|---|---|---|
| `account/AccountScreen.tsx` | Điều phối: fetch, state, overlay, 3 trạng thái màn hình | ✅ |
| `account/AccountHeader.tsx` | Tiêu đề "My account" + card total balance + nút ẩn/hiện + nút `+` | ✅ |
| `account/AccountGroupCard.tsx` | Card nhóm: tiêu đề + số lượng + chevron thu gọn + danh sách | ✅ |
| `account/AccountListRow.tsx` | 1 dòng tài khoản: avatar, tên, số dư, nút `⋮` | ✅ |
| `account/AccountFormPanel.tsx` | Overlay Add Account + validate + submit | ✅ |
| `account/AccountKindSheet.tsx` | Bottom sheet chọn loại tài khoản | ✅ |
| `account/CurrencySheet.tsx` | Bottom sheet chọn tiền tệ | ✅ |
| `account/AccountSkeleton.tsx` | Skeleton giữ đúng bố cục | ❌ |

## 5. Validation & xử lý lỗi (Add Account)

| Trường | Luật |
|---|---|
| Account name | Bắt buộc, ≤ 50 ký tự, không trùng tên tài khoản đã có (schema có `uq_account_user_id_name`) |
| Initial balance | Không bắt buộc (mặc định 0), phải là số ≥ 0 |
| Account type | Mặc định `CASH`, luôn có giá trị |
| Currency | Mặc định `VND`, luôn có giá trị |
| Description | Không bắt buộc, ≤ 200 ký tự |

- Lỗi field: chữ `text-xs text-rose-600` ngay dưới ô, viền ô `border-rose-600`, `aria-invalid`.
- Lỗi submit: `FormAlert tone="error"` + nút thử lại.
- Đang lưu: nút Save `disabled` + chữ "Đang lưu...".

## 6. Ba trạng thái màn hình

- **Loading**: `AccountSkeleton` (header emerald + card danh sách), không dùng spinner.
- **Empty**: "Bạn chưa có tài khoản nào" + gợi ý + CTA "Thêm tài khoản" mở luôn form.
- **Error**: `FormAlert tone="error"` "Không tải được danh sách tài khoản." + nút Thử lại gọi lại fetch.

## 7. Test case cần kiểm bằng tay

- [x] 375px: không cuộn ngang, số dư dài không tràn, tab bar không che nội dung.
- [ ] Ẩn/hiện tổng số dư đổi đúng icon `Eye`/`EyeOff` và `aria-pressed`.
- [x] Thu gọn/mở rộng nhóm: chevron xoay, `aria-expanded` đúng.
- [x] Thêm tài khoản mới → xuất hiện trong danh sách, số lượng nhóm +1, tổng số dư cộng đúng
      (tài khoản khác tiền tệ được quy đổi trước khi cộng, không cộng thẳng).
- [x] Trùng tên → báo lỗi, không đóng form.
- [x] Chọn account type → dòng tương ứng cập nhật, dấu `✓` đúng mục đang chọn.
- [ ] Esc đóng sheet/overlay, focus trả về nút đã mở.
- [ ] Nút `⋮` hiện thông báo "đang phát triển".

## 8. Hạng mục thực hiện

### Thêm file

- [x] `src/lib/account-types.ts`
- [x] `src/lib/account-client.ts`
- [x] `src/app/components/account/AccountScreen.tsx`
- [x] `src/app/components/account/AccountHeader.tsx`
- [x] `src/app/components/account/AccountGroupCard.tsx`
- [x] `src/app/components/account/AccountListRow.tsx`
- [x] `src/app/components/account/AccountFormPanel.tsx`
- [x] `src/app/components/account/AccountKindSheet.tsx`
- [x] `src/app/components/account/CurrencySheet.tsx`
- [x] `src/app/components/account/AccountSkeleton.tsx`

### Sửa file

- [x] `src/app/(main)/account/page.tsx` — render `AccountScreen` thay `ScreenPlaceholder`
- [x] `src/app/components/FullScreenPanel.tsx` — thêm prop tuỳ chọn `action?: ReactNode` để đặt
      nút `✓` bên phải header (mockup Add Account có nút này; thay đổi tương thích ngược,
      các nơi đang dùng không phải sửa)

### Xóa file

- (không có)

### Verify

- [x] `npm run lint` sạch
- [x] `npm run build` sạch
- [x] Rà `git diff` đúng phạm vi plan
- [x] Kiểm thực tế ở 375px trên dev server: danh sách, thu gọn nhóm, Add Account, 2 sheet,
      lỗi trùng tên, tạo tài khoản mới (tổng số dư và số lượng nhóm cập nhật đúng)
