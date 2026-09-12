---
name: playwright-e2e-generator
description: Sinh test end-to-end bằng Playwright từ thiết kế màn hình (mô tả UI, ảnh mockup, hoặc file screen design). Dùng Skill này khi người dùng yêu cầu "viết test E2E", "sinh test Playwright cho màn hình ...", "tạo test giao diện từ thiết kế màn hình", "viết kịch bản kiểm thử UI".
---

# Playwright E2E Generator

## Nguyên tắc
- Góc nhìn người dùng cuối: thao tác qua UI trên trình duyệt, KHÔNG gọi thẳng API trừ bước dọn dữ liệu.
- Input người dùng cung cấp: thiết kế màn hình (mô tả / ảnh / đường dẫn file), URL app, danh sách luồng cần kiểm.
- Với mỗi màn hình sinh đủ 3 nhóm test: happy path, validate/edge case, negative case (đúng theo ràng buộc ghi trên thiết kế).

## Quy ước code
1. Đặt file tại e2e-test/<tên-màn-hình>.spec.ts. Mỗi test() độc lập, không phụ thuộc thứ tự chạy.
2. Locator ưu tiên getByRole / getByLabel / getByText; chỉ dùng getByTestId khi bắt buộc.
3. Dùng fixture login chung tại e2e-test/fixtures/auth.ts (đọc E2E_EMAIL / E2E_PASSWORD từ .env); test cần đăng nhập thì import fixture này.
4. Màn hình phức tạp: tách Page Object vào e2e-test/pages/<Tên>Page.ts.
5. Assertion dùng expect() của Playwright (auto-wait), không dùng page.waitForTimeout cố định.
6. Test tạo dữ liệu phải tự xoá ở afterEach (gọi API xoá hoặc thao tác UI xoá).
7. Không tự sửa playwright.config.ts đã có; giả định server đã deploy sẵn.

## Sau khi sinh
- Liệt kê bảng: Màn hình | Test case | Nhóm | Locator chính | Assertion.
- Nhắc người dùng chạy: npx playwright test và npx playwright show-report.