---
name: testscript-generator
description: Sinh test script tự động (integration/API test) từ một file test case đã có. Dùng Skill này khi người dùng yêu cầu "viết test script", "sinh test tự động cho API ...", "chuyển bộ test case thành script K6", "viết integration test theo góc nhìn Tester".
---

# Testscript Generator

## Nguyên tắc
- Góc nhìn Tester (black-box): chỉ gọi API qua HTTP, KHÔNG đọc code implementation (route handler, service...).
- Input bắt buộc người dùng cung cấp: 
  - Đường dẫn file test case (`plans/test/*.md`) 
  - base URL + endpoint cần test.
  - API Spect (OpenAPI/Swagger) nếu có, để Claude Code đối chiếu với file test case.

## Quy trình
1. Đọc file test case, map mỗi dòng Test Case (TC) thành một request + assertion (status code, và response body khi test case có nêu).
2. Sinh script chuẩn **Grafana K6**, `VUs = 1` (chưa phải performance test).
3. Trong `setup()`: gọi `POST /api/auth/login` với credential từ biến môi trường (`.env`) để lấy access token; gọi `GET /api/categories?pageSize=200` và `GET /api/accounts?pageSize=100` để lấy sẵn `categoryId`, `accountId` hợp lệ. Token dùng cho mọi request sau.
4. Ghi script ra `test/{domain}/{sub-domain}/testscript.js`.
5. Thêm script chạy tương ứng vào `package.json` (vd `"test:api_transaction_expense": "k6 run test/transaction/expense/testscript.js"`).
6. Giả định server đã deploy sẵn — KHÔNG tự khởi động server trong script.

## Sau khi sinh
In ra bảng tóm tắt: mỗi TC ↔ request ↔ assertion, để Tester đối chiếu nhanh với file test case gốc.