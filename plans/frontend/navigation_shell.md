# Plan: Tái cấu trúc frontend — Navigation shell mobile-first

## 1. Mục tiêu

Dựng lại toàn bộ khung giao diện theo hướng mobile-first responsive dựa trên
`docs/mockup/navigation-bar.png` và `docs/mockup/screen-transition.png`:

- 5 tab điều hướng: **Home · Account · Record · Report · Setting** (thứ tự trái → phải).
- **Record** là hành động chính, nằm chính giữa tab bar, nổi bật nhất (nút tròn nổi kiểu FAB như mockup).
- Mobile (`< md`): bottom tab bar cố định. Từ `md:` trở lên: chuyển thành sidebar bên trái.
- Mọi màn hình **chưa implement chức năng**, chỉ hiển thị một dòng "To be implemented" ở giữa màn hình.
- Icon dùng `lucide-react`, **không dùng emoji**.

## 2. Quyết định thiết kế

### 2.1 Cấu trúc route

| Tab | Route | Icon (lucide) |
|---|---|---|
| Home | `/` | `House` |
| Account | `/account` | `Wallet` |
| Record | `/record` | `Plus` |
| Report | `/report` | `PieChart` |
| Setting | `/setting` | `Settings` |

- Dùng **route group `src/app/(main)/`** để 5 màn hình cùng chia sẻ một layout chứa navigation,
  đồng thời chừa chỗ cho các màn hình ngoài shell sau này (Login / Register / Forgot Password
  theo `screen-transition.png`) mà không bị bọc bởi tab bar.
- `src/app/(main)/layout.tsx` render `<Sidebar />` + `<main>{children}</main>` + `<BottomTabBar />`.
- Root layout (`src/app/layout.tsx`) giữ nguyên vai trò `<html>/<body>`, chỉ cập nhật metadata + nền trang.

### 2.2 Màu sắc & kích thước (theo skill `frontend-coding`)

- Tab bar / sidebar active: `bg-emerald-600` / `text-emerald-600`; inactive `text-slate-500`.
- Mockup vẽ màu xanh dương, nhưng bảng màu project quy định primary là **emerald-600** → dùng emerald.
- Nền trang `bg-slate-50`, nền card/nav `bg-white`, border `border-slate-200`.
- Icon tab bar `size={20}`, icon nút Record `size={24}`.
- Mọi vùng bấm `min-h-11 min-w-11` (≥ 44×44px).
- Nội dung chừa `pb-20 md:pb-0` để tab bar không che; sidebar `hidden md:flex md:w-56`.

### 2.3 Tránh lặp code

Cấu hình 5 tab được khai báo **một lần** trong `src/app/components/navigation.ts` và dùng chung cho cả
`BottomTabBar` và `Sidebar` — sửa một chỗ, hai nơi cùng đổi.

`BottomTabBar` và `Sidebar` là client component (`'use client'`) vì cần `usePathname()` để tô tab đang active.
Các page đều là server component.

### 2.4 Xử lý code cũ

`src/app/page.tsx` hiện đang là màn hình quản lý chi tiêu (form + filter + table) dùng
`ExpenseForm` / `ExpenseFilter` / `ExpenseTable`. Theo yêu cầu "mọi màn hình chỉ để To be implemented",
màn Home sẽ thay bằng placeholder → 3 component này thành code chết.

→ **Đề xuất: xoá 3 file component đó.** Các API route trong `src/app/api/` **giữ nguyên**, không đụng tới.
Nếu bạn muốn giữ lại để tham khảo, báo lại trước khi tôi code.

## 3. Hạng mục công việc

### Thêm file

- `src/app/components/navigation.ts` — mảng `NAV_ITEMS` (href, label, icon, isPrimary) dùng chung.
- `src/app/components/BottomTabBar.tsx` — tab bar mobile, nút Record nổi ở giữa.
- `src/app/components/Sidebar.tsx` — sidebar từ `md:` trở lên.
- `src/app/components/ScreenPlaceholder.tsx` — khối "To be implemented" căn giữa, nhận prop `title`.
- `src/app/(main)/layout.tsx` — layout chứa navigation.
- `src/app/(main)/page.tsx` — Home.
- `src/app/(main)/account/page.tsx` — Account.
- `src/app/(main)/record/page.tsx` — Record.
- `src/app/(main)/report/page.tsx` — Report.
- `src/app/(main)/setting/page.tsx` — Setting.

### Sửa file

- `package.json` — thêm dependency `lucide-react` (chạy `npm install lucide-react`).
- `src/app/layout.tsx` — cập nhật `metadata` (title/description đúng tên app), `lang="vi"`,
  body nền `bg-slate-50 text-slate-800`.
- `src/app/globals.css` — bỏ block `prefers-color-scheme: dark` và `font-family: Arial` đang ghi đè
  font Geist / bảng màu; giữ `@import "tailwindcss"` và khai báo font token.

### Xoá file

- `src/app/page.tsx` (thay bằng `src/app/(main)/page.tsx`).
- `src/app/components/ExpenseForm.tsx`
- `src/app/components/ExpenseFilter.tsx`
- `src/app/components/ExpenseTable.tsx`

## 4. Edge case & lưu ý

- **Active state của Home**: `usePathname()` trả `/` cho Home. So khớp: `pathname === href` cho `/`,
  `pathname.startsWith(href)` cho các tab còn lại → sau này vào route con (vd `/account/123`)
  tab Account vẫn sáng.
- **375px (iPhone SE)**: 5 tab chia đều, label `text-xs`, không wrap, không tràn ngang.
- **Nút Record**: dịch lên trên tab bar (`-translate-y-*`), có viền trắng tách khỏi nền như mockup;
  vẫn đảm bảo vùng bấm ≥ 44px và không che nội dung.
- **Safe area iOS**: tab bar thêm `pb-[env(safe-area-inset-bottom)]` để không bị home indicator che.
  Đây là giá trị runtime của thiết bị, dùng arbitrary value của Tailwind chứ không viết CSS riêng.
- **A11y**: mỗi tab là `<Link>` có text label (icon `aria-hidden`); nút Record chỉ có icon trên mobile
  → có `aria-label="Thêm giao dịch"`. Tab đang active gắn `aria-current="page"`.
- **Chưa có 3 trạng thái loading/empty/error** vì các màn hình chưa fetch dữ liệu — sẽ bổ sung khi
  implement từng màn hình.

## 5. Checklist

- [x] Cài `lucide-react`
- [x] Tạo `src/app/components/navigation.ts`
- [x] Tạo `src/app/components/ScreenPlaceholder.tsx`
- [x] Tạo `src/app/components/BottomTabBar.tsx`
- [x] Tạo `src/app/components/Sidebar.tsx`
- [x] Tạo `src/app/(main)/layout.tsx`
- [x] Tạo 5 page: Home / Account / Record / Report / Setting
- [x] Cập nhật `src/app/layout.tsx` (metadata, lang, nền trang)
- [x] Dọn `src/app/globals.css`
- [x] Xoá `src/app/page.tsx` và 3 component Expense cũ
- [x] Chạy `npm run lint` sạch
- [ ] Chạy `npm run build` sạch — **chưa xanh, do lỗi có sẵn ngoài phạm vi plan** (xem mục 6)
- [x] Kiểm tra `git diff` đúng phạm vi plan
- [x] Kiểm tra thực tế trên trình duyệt ở 375px và 1024px

## 6. Vấn đề tồn đọng (ngoài phạm vi plan này)

`npm run build` fail ở bước type check, **toàn bộ lỗi nằm trong `src/app/api/`** và đã có từ trước
khi thực hiện plan này:

- `src/app/api/expenses/route.ts`, `expenses/[id]/route.ts`, `expenses/summary/route.ts` gọi
  `prisma.expense` và dùng type `Prisma.ExpenseWhereInput` / `ExpenseUpdateInput`, nhưng
  `prisma/schema.prisma` không có model `Expense` — model tương ứng là **`Transaction`**.
- `src/app/api/categories/route.ts` tạo `Category` thiếu field bắt buộc `type`.

Các file này không nằm trong phạm vi plan (plan chỉ đụng tới UI, API route giữ nguyên). Cần một task
backend riêng để đồng bộ API route với schema hiện tại. `npm run lint` đã sạch và không file nào
thuộc plan này gây lỗi type.
