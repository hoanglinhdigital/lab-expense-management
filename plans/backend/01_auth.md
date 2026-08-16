# Plan Backend 01 — Auth

Nguồn: `docs/api-spec/auth.yaml`. Phụ thuộc: `plans/backend/00_foundation.md`.

## 1. Endpoint

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/api/auth/register` | Không | Đăng ký, set cookie `session`, trả `201` |
| POST | `/api/auth/login` | Không | Đăng nhập, set cookie `session`, trả `200` |
| POST | `/api/auth/logout` | Có | Huỷ session trong DB + xoá cookie, trả `204` |
| GET | `/api/auth/me` | Có | Hồ sơ user hiện tại |
| PATCH | `/api/auth/me` | Có | Cập nhật `name` / `defaultCurrency` |

## 2. Data flow

```
register: validate -> check email trùng (isDeleted=false) -> bcrypt.hash(10)
       -> $transaction { create User, create Session } -> set cookie -> 201 { data: User }
login:    validate -> tìm user theo email (isDeleted=false) -> bcrypt.compare
       -> sai bất kỳ vế nào đều trả INVALID_CREDENTIALS -> create Session -> set cookie -> 200
logout:   xoá Session theo token -> set cookie rỗng Max-Age=0 -> 204
me:       withAuth -> trả user (không bao giờ có passwordHash)
```

## 3. Validation (zod)

- `email`: bắt buộc, đúng định dạng, `maxLength 255`, chuẩn hoá `trim().toLowerCase()` trước khi lưu/so khớp.
- `password`: bắt buộc, `min 6`, `max 72` (giới hạn của bcrypt).
- `name`: bắt buộc, `min 1`, `max 100`, `trim()`.
- `defaultCurrency`: tuỳ chọn, đúng 3 ký tự, viết hoa, **phải tồn tại trong bảng `Currency`** — không thì `400` với `details.defaultCurrency`.
- `UpdateUserRequest`: `minProperties: 1` → body rỗng trả `400 VALIDATION_ERROR`.

## 4. Edge case & mã lỗi

| Tình huống | Kết quả |
|---|---|
| Email đã tồn tại (chưa xoá) | `409 EMAIL_ALREADY_EXISTS` |
| Email tồn tại nhưng `isDeleted = true` | Coi như chưa tồn tại, cho đăng ký lại |
| Sai email **hoặc** sai mật khẩu | `401 INVALID_CREDENTIALS` — cùng một thông điệp, không phân biệt |
| Login khi user `isDeleted = true` | `401 INVALID_CREDENTIALS` |
| Race hai request register cùng email | Bắt lỗi unique `uq_user_email` của Prisma → `409` |
| `logout` khi cookie đã hết hạn | `401 UNAUTHORIZED` (đúng spec, không trả `204`) |
| `PATCH /auth/me` đổi `defaultCurrency` sang mã không hỗ trợ | `400 VALIDATION_ERROR` |

**Không bao giờ** đưa `passwordHash` vào response — service dùng `select` tường minh, không dùng spread từ record Prisma.

## 5. Hạng mục

### Thêm file

- `src/app/api/auth/register/route.ts` — `POST`
- `src/app/api/auth/login/route.ts` — `POST`
- `src/app/api/auth/logout/route.ts` — `POST`
- `src/app/api/auth/me/route.ts` — `GET`, `PATCH`
- `src/lib/services/auth.service.ts` — `registerUser`, `loginUser`, `logoutUser`, `getCurrentUser`, `updateCurrentUser`
- `src/lib/api/schemas/auth.schema.ts` — zod schema cho 3 request body
- `src/lib/api/serializers/user.serializer.ts` — map record Prisma → `User` của spec

### Sửa file

- Không sửa file có sẵn.

### Xóa file

- Không xoá file nào.

## 6. Test case

| # | Tình huống | Kỳ vọng |
|---|---|---|
| A1 | Register hợp lệ | `201`, có `Set-Cookie: session=...; HttpOnly`, body có `data.id`, không có `passwordHash` |
| A2 | Register email trùng | `409 EMAIL_ALREADY_EXISTS` |
| A3 | Register mật khẩu 5 ký tự | `400`, `details.password` |
| A4 | Register email sai định dạng | `400`, `details.email` |
| A5 | Register `defaultCurrency = "XYZ"` | `400`, `details.defaultCurrency` |
| A6 | Login đúng | `200` + cookie, `data.email` khớp |
| A7 | Login sai mật khẩu | `401 INVALID_CREDENTIALS` |
| A8 | Login email không tồn tại | `401 INVALID_CREDENTIALS` (thông điệp giống A7) |
| A9 | `GET /auth/me` có cookie | `200`, đúng user |
| A10 | `GET /auth/me` không cookie | `401 UNAUTHORIZED` |
| A11 | `PATCH /auth/me` đổi `name` | `200`, tên mới, `updatedAt` thay đổi |
| A12 | `PATCH /auth/me` body `{}` | `400 VALIDATION_ERROR` |
| A13 | Logout rồi gọi `GET /auth/me` bằng cookie cũ | `401 UNAUTHORIZED`, bản ghi `Session` đã bị xoá |
| A14 | Đăng nhập 2 thiết bị, logout 1 | Phiên còn lại vẫn dùng được |

## 7. Checklist

- [x] Viết `src/lib/api/schemas/auth.schema.ts`
- [x] Viết `src/lib/api/serializers/user.serializer.ts`
- [x] Viết `src/lib/services/auth.service.ts`
- [x] Viết route `POST /api/auth/register`
- [x] Viết route `POST /api/auth/login`
- [x] Viết route `POST /api/auth/logout`
- [x] Viết route `GET|PATCH /api/auth/me`
- [x] Chạy `npm run lint` + `npm run build`
- [x] Chạy test script kiểm chứng A1–A14
