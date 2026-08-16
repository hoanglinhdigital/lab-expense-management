---
name: api-design
description: Áp dụng khi thiết kế API mới hoặc cập nhật API spec cho project lab-expense-management, trước khi implement backend. Dùng skill này khi task yêu cầu thêm/sửa endpoint, viết hoặc chỉnh file OpenAPI trong docs/api-spec/, định nghĩa request/response, phân trang, mã lỗi, xác thực — hoặc khi user nói "thiết kế API", "viết spec", "thêm endpoint", "sửa API", "swagger", "openapi", kể cả khi họ chưa nhắc tới file spec.
---

# API design rules — lab-expense-management

Spec là hợp đồng giữa frontend và backend. Frontend dựng màn hình dựa trên spec, backend implement theo spec — nếu spec viết sau code thì hai bên đã lệch nhau từ trước khi bắt đầu. Vì vậy **spec luôn đi trước code**, và mọi quy ước dưới đây tồn tại để hai bên đọc một file là đủ hiểu, không phải hỏi lại.

## 1. Chuẩn tài liệu

- Mọi API phải có spec theo chuẩn **OpenAPI 3.0 (Swagger)** trước khi viết code.
- File spec lưu tại `/docs/api-spec/<ten-cum-chuc-nang>.yaml` — **mỗi cụm chức năng một file**, không gom tất cả vào một file khổng lồ và không tách nhỏ theo từng endpoint.

## 2. Danh sách cụm chức năng cố định

Chỉ dùng đúng 8 tên này làm tên file và tên `tag`:

`account` · `report` · `auth` · `category` · `contact` · `currency` · `home` · `transaction`

Nếu endpoint mới không thuộc cụm nào trong danh sách, **hỏi user** trước khi tự đặt tên cụm mới — tên cụm là thứ frontend dùng để tổ chức code, thêm bừa sẽ vỡ cấu trúc hai bên.

## 3. Nội dung bắt buộc của mỗi spec

- **`info`** (`title`, `version`), **`servers`**, **`tags`** đặt đúng theo tên cụm chức năng ở mục 2.
- Mỗi endpoint phải có đủ: `summary`, `operationId`, `parameters`, `requestBody` (nếu có body), `responses`.
  - `operationId` viết camelCase, duy nhất toàn project, đọc là biết việc: `listTransactions`, `createTransaction`, `getTransactionById`.
- **Response bắt buộc mô tả đủ các mã**: `200`/`201`, `400` (validation), `401` (chưa đăng nhập), `403` (không có quyền), `404`, `500`. Thiếu một mã nghĩa là frontend sẽ không xử lý trường hợp đó — đừng bỏ vì "chắc không xảy ra".
- **Toàn bộ schema đặt trong `components/schemas`** và tái sử dụng bằng `$ref`. Không viết schema inline lặp lại ở nhiều chỗ — sửa một chỗ mà quên chỗ kia là nguồn lỗi phổ biến nhất của spec.
- Định nghĩa `securitySchemes` cho xác thực và **áp dụng cho mọi endpoint trừ nhóm `auth`**.

## 4. Quy ước dữ liệu

- **Số tiền là chuỗi decimal**, ví dụ `"150000.00"` — kiểu `string`, **không dùng `number`**, để tránh sai số floating point. Số tiền sai một xu vì IEEE 754 là lỗi không ai muốn debug.
- **Thời gian theo ISO 8601 UTC**, ví dụ `"2026-08-15T09:30:00Z"`. Việc đổi sang giờ địa phương là việc của frontend.
- **Response dạng danh sách luôn có phân trang**:

  ```json
  { "data": [], "meta": { "page": 1, "pageSize": 20, "total": 0 } }
  ```

  Kể cả khi hiện tại dữ liệu chắc chắn ít — thêm phân trang sau sẽ là breaking change.
- **Response lỗi thống nhất một dạng duy nhất**:

  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} } }
  ```

  Nhờ vậy frontend viết đúng một hàm xử lý lỗi cho toàn app.

## 5. Quy trình

1. **Sinh spec trước** — viết file `.yaml` vào `docs/api-spec/`.
2. **Hiển thị tóm tắt endpoint cho user duyệt**: bảng gồm method, path, `operationId`, mô tả ngắn. Dừng lại ở đây và chờ.
3. **Chỉ khi được duyệt mới chuyển sang implement** (tiếp tục theo bước Plan trong `CLAUDE.md`).

Khi **sửa API đã có**: cập nhật spec trước, cho user duyệt phần thay đổi, rồi mới sửa code. Không bao giờ sửa code trước rồi "cập nhật spec cho khớp sau".
