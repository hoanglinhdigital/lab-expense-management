# Plan — Màn hình Auth (Login / Register)

Mockup: `docs/mockup/auth/login.png`, `docs/mockup/auth/register.png`.

## Quyết định đã chốt với user

- **Bảng màu**: dùng **emerald** theo skill `frontend-coding` (không dùng blue của mockup) để đồng bộ với tab bar / sidebar đã có. Bố cục, spacing, thứ tự phần tử giữ đúng mockup.
- **Phạm vi**: chỉ frontend. Submit gọi hàm **stub** trong `src/lib/auth-client.ts`, chưa có API thật (`docs/api-spec/` còn trống).
- **Social login**: render đủ 3 nút Google / Facebook / Apple, bấm được, hiện thông báo "Tính năng đang phát triển". "Quên mật khẩu?" xử lý tương tự (chưa có màn hình đích).

## Cấu trúc route

Route group `(auth)` riêng, **không** nằm trong `(main)` nên không có bottom tab bar / sidebar.

```
src/app/(auth)/layout.tsx      → nền gradient + khung căn giữa, max-w-md
src/app/(auth)/login/page.tsx
src/app/(auth)/register/page.tsx
```

## Thêm file

- [x] `src/app/(auth)/layout.tsx` — layout dùng chung: gradient header emerald, brand header, khung `max-w-md`, footer slot.
- [x] `src/app/(auth)/login/page.tsx` — Server Component, render `AuthCard` + `LoginForm` + link sang Register.
- [x] `src/app/(auth)/register/page.tsx` — Server Component, render `AuthCard` + `RegisterForm` + link sang Login.
- [x] `src/app/components/AuthBrandHeader.tsx` — icon ví (lucide `Wallet`) trong ô bo góc, tên app + tagline.
- [x] `src/app/components/AuthCard.tsx` — card trắng bo góc, nhận `title`, `subtitle`, `children`.
- [x] `src/app/components/AuthTextField.tsx` — input có icon dẫn đầu, hỗ trợ toggle hiện/ẩn mật khẩu, hiển thị lỗi từng field.
- [x] `src/app/components/AuthSubmitButton.tsx` — CTA full-width, trạng thái `pending` (spinner + disable).
- [x] `src/app/components/FormAlert.tsx` — banner lỗi/thông tin, tuỳ chọn nút "Thử lại".
- [x] `src/app/components/SocialLoginRow.tsx` — divider "Hoặc login với" + 3 nút tròn brand.
- [x] `src/app/components/LoginForm.tsx` — Client Component: state, validate, submit stub.
- [x] `src/app/components/RegisterForm.tsx` — Client Component: state, validate, submit stub.
- [x] `src/lib/auth-client.ts` — kiểu dữ liệu, validate dùng chung, stub `login()` / `register()`.

## Sửa file

- [x] Không sửa file có sẵn. (`src/app/layout.tsx` đã có `bg-slate-50`, dùng lại được nguyên trạng.)

## Xóa file

- [x] Không xoá file nào.

## Components / props / state

| Component | Props | State |
|---|---|---|
| `AuthBrandHeader` | — | — |
| `AuthCard` | `title`, `subtitle?`, `children` | — |
| `AuthTextField` | `id`, `name`, `label`, `placeholder`, `icon`, `type`, `value`, `onChange`, `error?`, `autoComplete?`, `revealable?` | `revealed` (chỉ khi `revealable`) |
| `AuthSubmitButton` | `label`, `pending` | — |
| `FormAlert` | `message`, `tone` (`error` \| `info`), `onRetry?` | — |
| `SocialLoginRow` | `onSelect(provider)` | — |
| `LoginForm` | — | `email`, `password`, `errors`, `pending`, `formError`, `notice` |
| `RegisterForm` | — | `email`, `password`, `confirmPassword`, `firstName`, `lastName`, `errors`, `pending`, `formError` |

## Data flow

1. User nhập → state trong `LoginForm` / `RegisterForm`, lỗi của field bị xoá ngay khi user gõ lại.
2. Submit → `validateLogin()` / `validateRegister()` (client). Có lỗi → set `errors`, focus giữ nguyên, không gọi stub.
3. Hợp lệ → `pending = true` → gọi `login()` / `register()` trong `src/lib/auth-client.ts`.
4. Kết quả `{ ok: true }` → `router.push('/')` (login) hoặc `router.push('/login')` (register).
5. Kết quả `{ ok: false, message }` → `FormAlert` tone `error` + nút "Thử lại" gọi lại đúng submit vừa fail.

## Validation

| Field | Rule | Message |
|---|---|---|
| email | bắt buộc, đúng định dạng | "Vui lòng nhập email." / "Email không đúng định dạng." |
| password | bắt buộc, ≥ 6 ký tự | "Vui lòng nhập mật khẩu." / "Mật khẩu phải có ít nhất 6 ký tự." |
| confirmPassword | bắt buộc, trùng password | "Vui lòng xác nhận mật khẩu." / "Mật khẩu xác nhận không khớp." |
| firstName / lastName | không bắt buộc | — |

## Edge cases

- [x] Submit khi đang `pending` → nút disabled, không gửi trùng.
- [x] Email có khoảng trắng đầu/cuối → `trim()` trước khi validate và gửi.
- [x] Mật khẩu chỉ gồm khoảng trắng → coi như không hợp lệ (độ dài tính sau khi bỏ khoảng trắng hai đầu).
- [x] Stub trả lỗi → hiện `FormAlert` + "Thử lại", state form giữ nguyên để không phải nhập lại.
- [x] Social / "Quên mật khẩu?" → `FormAlert` tone `info` "Tính năng đang phát triển", tự thay thế notice cũ.
- [x] Toggle mật khẩu không làm mất giá trị đã nhập, `aria-label` đổi theo trạng thái.

## Trạng thái màn hình

Màn hình auth không fetch dữ liệu khi mở, nên không có loading skeleton / empty. Ba trạng thái áp cho **hành động submit**:

- Loading → nút CTA chuyển sang spinner + chữ "Đang xử lý...", các input disabled.
- Error → `FormAlert` tone `error` kèm nút "Thử lại".
- Empty → không áp dụng (không có danh sách dữ liệu).

## Responsive & a11y

- [x] Mobile-first, khung `max-w-md mx-auto`, dùng tốt ở 375px, không cuộn ngang.
- [x] Mọi vùng bấm (nút toggle mật khẩu, nút social, link) ≥ 44×44px.
- [x] Input có `<label>` (ẩn bằng `sr-only` khi mockup chỉ hiện placeholder), lỗi nối bằng `aria-describedby` + `aria-invalid`.
- [x] Icon đứng một mình có `aria-label`; icon đi kèm text đặt `aria-hidden`.

## Test case (thủ công)

- [x] Login: bỏ trống cả hai field → hiện 2 lỗi, không gọi stub.
- [x] Login: email sai định dạng → lỗi email.
- [x] Login: mật khẩu < 6 ký tự → lỗi mật khẩu.
- [x] Login hợp lệ → nút vào trạng thái pending rồi điều hướng về `/`.
- [x] Register: mật khẩu và xác nhận khác nhau → lỗi ở field xác nhận.
- [x] Register hợp lệ (không nhập họ tên) → thành công.
- [x] Toggle hiện/ẩn mật khẩu ở cả 2 field của Register hoạt động độc lập.
- [x] Bấm Google/Facebook/Apple và "Quên mật khẩu?" → hiện thông báo đang phát triển.
- [x] Điều hướng qua lại Login ↔ Register bằng link dưới card.
- [x] `npm run lint` và `npm run build` chạy sạch.
