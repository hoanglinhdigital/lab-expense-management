# Plan: Màn hình Setting (Other) — frontend

Nguồn mockup: `docs/mockup/setting/setting-1.png` (1 ảnh). Chỉ đọc đúng thư mục này.

## 1. Phạm vi

Dựng route `/setting` (hiện là `ScreenPlaceholder`), gồm 4 khối theo mockup từ trên xuống:

1. **Header người dùng**: avatar tròn chữ cái đầu, "Hello!" + tên người dùng, nút bánh răng ở góc
   phải. Dưới header là card **Premium Member** + "valid until 31/12/2999".
2. **Feature** — lưới 4 ô: Interface · Bill Extraction · Budget · Categories.
3. **Utilities** — lưới 4 ô: Calculate loan · Personal Income Tax · Exchange rates utility ·
   Export data.
4. **Danh sách menu** (card trắng, 7 dòng): General settings · Data · Share with friends ·
   Do you like this app? (kèm dòng phụ "Rate us 5 stars on Apple Store!") · Feedback ·
   Help & Information · **Logout** (màu rose).

**Không nằm trong phạm vi**: API thật, sửa `prisma/schema.prisma`, migration, và toàn bộ màn đích
của 8 ô lưới + 6 dòng menu đầu (mockup chưa có màn nào trong số đó).

## 2. Quyết định thiết kế

### 2.1 Bảng màu

**Ngoại lệ có chủ đích, đã được user duyệt**: màn này giữ đúng tông của mockup (header cam, icon
xanh dương) thay vì ép về bảng màu emerald của skill `frontend-coding`. Đây là 2 màu nằm ngoài
bảng ở mục 2 của skill; chỉ áp dụng trong phạm vi màn Setting, các màn khác giữ nguyên. Ghi comment
nêu rõ ngoại lệ này ở đầu `SettingHeader.tsx` và `setting-types.ts` để reviewer không tưởng nhầm là
làm sai bảng màu.

| Thành phần trong mockup | Class dùng thật |
|---|---|
| Header cam | `bg-orange-500` + chữ trắng |
| Avatar tròn | `bg-white/25` + chữ trắng |
| Card Premium Member | `bg-white` + `text-slate-800` |
| Icon kim cương Premium | `text-blue-600` |
| Icon ô lưới / dòng menu (xanh dương) | `text-blue-600` |
| Nhãn "5 stars" (cam) | `text-orange-500` |
| Dòng Logout (đỏ) | `text-rose-600` |
| Nút CTA trong dialog Logout | `bg-rose-600` (hành động nguy hiểm) / `border-slate-200` cho Hủy |
| Nền trang / nền card | `bg-slate-50` / `bg-white` |

### 2.2 Điều hướng

- `/setting` là tab thứ 5 trong `NAV_ITEMS` (đã có), nằm trong `(main)/layout.tsx` → bottom tab bar
  và sidebar giữ nguyên, không sửa `navigation.ts`.
- **Logout**: mở dialog xác nhận (theo khuôn `ContactCreateDialog`), xác nhận → `router.replace("/login")`.
  Không đăng xuất ngay khi bấm vì đây là hành động khó quay lại.
- Nút bánh răng ở header: mockup không có màn đích riêng → cuộn/chỉ tới nhóm menu là quá mức; hiển
  thị thông báo "đang phát triển" như các mục khác, giữ nhất quán.

### 2.3 Hành vi chưa được mockup mô tả

Theo tiền lệ `ReportScreen` / `AccountScreen`: hiện `FormAlert tone="info"` nội dung
"Tính năng đang phát triển, vui lòng quay lại sau." cho 8 ô lưới, nút bánh răng, và 6 dòng menu
(trừ Logout). Không tự chế màn mới ngoài mockup.

### 2.4 Nguồn dữ liệu

`docs/api-spec/` vẫn trống. Làm đúng như `report-client.ts`: tạo `src/lib/setting-client.ts` là
**stub bất đồng bộ** có độ trễ giả lập (gợi ý API sau này: `GET /api/me/profile`), kiểu trả về ổn
định để khi có API chỉ thay thân hàm. Nhờ stub bất đồng bộ, 3 trạng thái loading / empty / error là thật.

Dữ liệu mẫu khớp mockup: `displayName: "Linh Nguyễn"`, `membershipLabel: "Premium Member"`,
`validUntil: "2999-12-31"` (hiển thị qua `formatDate` → `31/12/2999`).

### 2.5 Tái sử dụng

- Dùng lại `FormAlert` (notice/error + Thử lại), `formatDate` trong `src/lib/format.ts`,
  và khuôn dialog của `ContactCreateDialog` cho hộp xác nhận Logout.
- **Một component `SettingTileGroup` dùng cho cả 2 nhóm Feature và Utilities** (cùng bố cục: tiêu đề
  nhóm + lưới ô icon/nhãn) — không viết 2 lưới riêng.
- Avatar chữ cái đầu: dùng lại ý tưởng `accountInitial` nhưng nguồn là tên người dùng → viết
  `profileInitial()` trong `setting-types.ts`, không sửa `account-types.ts`.

### 2.6 Responsive

Mobile-first, kiểm ở 375px. Nội dung bọc `mx-auto w-full max-w-2xl`. Lưới ô `grid-cols-4` với nhãn
`text-xs` cho xuống dòng (mockup: "Personal Income Tax" 2 dòng, "Exchange rates utility" 2 dòng) —
các ô cùng hàng cao bằng nhau, không cuộn ngang. Vùng bấm ≥ 44×44px cho mọi ô/dòng/nút.

## 3. Cấu trúc dữ liệu

### 3.1 `src/lib/setting-types.ts`

- `UserProfile { displayName: string; membershipLabel: string; validUntil: string }`
  (`validUntil` dạng `YYYY-MM-DD`).
- `SettingAction { id, label, icon: LucideIcon }` — dùng chung cho ô lưới.
- `SETTING_FEATURES: SettingAction[]` — `Smartphone` (Interface) · `ScanLine` (Bill Extraction) ·
  `PiggyBank` (Budget) · `LayoutList` (Categories).
- `SETTING_UTILITIES: SettingAction[]` — `Calculator` (Calculate loan) · `UserRound`
  (Personal Income Tax) · `DollarSign` (Exchange rates utility) · `FileText` (Export data).
- `SettingMenuItem { id, label, description?, icon: LucideIcon, tone?: "danger" }`.
- `SETTING_MENU: SettingMenuItem[]` — `Settings` · `Database` · `Share2` · `Star`
  (kèm `description`) · `Mail` · `CircleQuestionMark` · `LogOut` (tone danger).
- `profileInitial(name: string): string` — chữ cái đầu viết hoa, chuỗi rỗng → `"?"`.

### 3.2 `src/lib/setting-client.ts`

- `fetchUserProfile(): Promise<UserProfile>` — stub delay ~500ms.
- `logout(): Promise<void>` — stub delay ~400ms (TODO: `POST /api/auth/logout`).

## 4. Component

Tất cả đặt tại `src/app/components/setting/`:

| File | Vai trò | Client? |
|---|---|---|
| `SettingScreen.tsx` | Điều phối: fetch profile, notice, dialog logout, 3 trạng thái | ✅ |
| `SettingHeader.tsx` | Avatar + "Hello!" + tên + nút bánh răng + card Premium | ✅ |
| `SettingTileGroup.tsx` | Tiêu đề nhóm + lưới 4 ô (dùng cho Feature và Utilities) | ✅ |
| `SettingMenuList.tsx` | Card trắng chứa danh sách dòng menu | ✅ |
| `SettingMenuRow.tsx` | 1 dòng menu: icon + label + description + tone danger | ✅ |
| `LogoutConfirmDialog.tsx` | Hộp xác nhận đăng xuất (Hủy / Đăng xuất) | ✅ |
| `SettingSkeleton.tsx` | Skeleton giữ đúng bố cục màn Setting | ❌ |

Ngưỡng tách: `SettingScreen` < 150 dòng; khối lưới lặp 2 lần, dòng menu lặp 7 lần → tách riêng.

## 5. Logic & xử lý lỗi

- `SettingScreen` giữ state: `profile | null`, `error`, `notice`, `confirmingLogout`, `reloadToken`.
- Effect fetch viết theo đúng khuôn `ReportScreen` (cờ `cancelled`, `setState` chỉ trong callback
  của promise — tránh `react-hooks/set-state-in-effect`).
- Bấm bất kỳ ô lưới / dòng menu (trừ Logout) hoặc nút bánh răng → `setNotice(COMING_SOON)`.
- Logout: mở dialog → xác nhận → gọi `logout()`; thành công `router.replace("/login")`, thất bại
  hiện lỗi ngay trong dialog + cho bấm lại. Nút đang chạy thì `disabled`.
- Không dùng `any`; props khai báo bằng `interface <Ten>Props`.
- Icon đứng một mình (bánh răng) có `aria-label`; icon kèm text có `aria-hidden`.

## 6. Ba trạng thái màn hình

| Trạng thái | Xử lý |
|---|---|
| Loading | `SettingSkeleton` (header + 2 lưới + card menu) |
| Empty | Không có danh sách phụ thuộc dữ liệu → không có trạng thái rỗng riêng. Nếu profile thiếu `membershipLabel`, ẩn card Premium thay vì hiện card trống |
| Error | `FormAlert tone="error"` — "Không tải được thông tin tài khoản." + nút Thử lại gọi lại đúng thao tác vừa fail (`reloadToken`) |

## 7. Test case cần kiểm bằng tay

- [x] 375px: không cuộn ngang; nhãn "Personal Income Tax" / "Exchange rates utility" xuống dòng, các ô trong hàng cao bằng nhau.
- [x] Tab bar không che dòng Logout (`pb-20` từ layout).
- [x] Tab Setting sáng khi ở `/setting`.
- [x] Bấm ô lưới → hiện thông báo "đang phát triển" (kiểm ô Interface; các ô/dòng còn lại dùng chung một handler).
- [x] Logout → hiện dialog; xác nhận → về `/login`. (Hủy / Esc: chưa kiểm bằng tay.)
- [x] Card "Premium Member" ở 375px không bị cắt chữ — đã hạ `text-base` → `text-sm` ở mobile sau khi phát hiện truncate.

## 8. Hạng mục thực hiện

### Thêm file

- [x] `src/lib/setting-types.ts`
- [x] `src/lib/setting-client.ts`
- [x] `src/app/components/setting/SettingScreen.tsx`
- [x] `src/app/components/setting/SettingHeader.tsx`
- [x] `src/app/components/setting/SettingTileGroup.tsx`
- [x] `src/app/components/setting/SettingMenuList.tsx`
- [x] `src/app/components/setting/SettingMenuRow.tsx`
- [x] `src/app/components/setting/LogoutConfirmDialog.tsx`
- [x] `src/app/components/setting/SettingSkeleton.tsx`

### Sửa file

- [x] `src/app/(main)/setting/page.tsx` — render `SettingScreen` thay `ScreenPlaceholder`

### Xóa file

- (không có)

### Verify

- [x] `npm run lint` sạch
- [x] `npm run build` sạch
- [x] Rà `git diff` đúng phạm vi plan
- [x] Kiểm thực tế ở 375px theo mục 7
