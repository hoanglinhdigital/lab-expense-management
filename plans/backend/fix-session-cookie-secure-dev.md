# Fix: Session cookie `Secure` khiến login không redirect trên ALB HTTP (dev)

## Bối cảnh / root cause

- ALB dev hiện chỉ có listener HTTP (port 80), chưa có HTTPS.
- `src/lib/api/session.ts` set cookie `session` với `secure: process.env.NODE_ENV === "production"`.
- Docker image set `NODE_ENV=production` → cookie có thuộc tính `Secure`.
- Trình duyệt từ chối lưu cookie `Secure` khi kết nối qua `http://` → sau khi login 200 OK, cookie không được lưu → `router.push("/")` chạy nhưng không có session → redirect ngược về `/login`, người dùng thấy "không có phản ứng gì".
- Đã xác nhận bằng `curl` trực tiếp: response login trả `Set-Cookie: ...; Secure; ...` trên kết nối HTTP.

## Thêm file

- Không có.

## Sửa file

- [x] `src/lib/api/session.ts`: thay `secure: process.env.NODE_ENV === "production"` bằng biến môi trường riêng `COOKIE_SECURE`, mặc định giữ nguyên hành vi cũ (`NODE_ENV === "production"`) khi biến không được set, cho phép override rõ ràng bằng `COOKIE_SECURE=false` (dùng ở cả `createSession` và `destroySession`).
- [x] `.env.example`: thêm dòng chú thích biến `COOKIE_SECURE` (tuỳ chọn, mặc định theo `NODE_ENV`).
- [x] `infra/terraform/modules/compute/variable.tf` + `main.tf`: thêm biến `cookie_secure_enabled` (bool) → env `COOKIE_SECURE` trong ECS Task Definition.
- [x] `infra/terraform/environments/dev/variable.tf` + `main.tf` + `terraform.tfvars` + `terraform.tfvars.example`: đặt `cookie_secure_enabled = false` cho dev (kèm comment trade-off: ALB dev chưa có HTTPS).
- [x] `infra/terraform/modules/compute/terraform.tfvars.example`: bổ sung `cookie_secure_enabled`.

## Đã kiểm chứng

- Build Docker image thành công (TypeScript strict mode không lỗi).
- Test end-to-end với MySQL tạm cục bộ: `COOKIE_SECURE=false` → response login trả `Set-Cookie: session=...; Path=/; ...; HttpOnly; SameSite=lax` (không còn `Secure`). Trước khi sửa, cookie có `Secure` ngay cả khi test qua HTTP.
- Đã dọn container/network/image test.

## Xoá file

- Không có.

## Ghi chú

- Đây là trade-off tạm thời cho dev (ALB chưa có HTTPS). Khi ALB có HTTPS listener (ACM cert), cần đặt lại `cookie_secure_enabled = true` để cookie session được bảo vệ đúng chuẩn.
- Không đổi hành vi mặc định khi biến `COOKIE_SECURE` không được set — production/staging tương lai vẫn an toàn theo mặc định (dựa vào `NODE_ENV`).
