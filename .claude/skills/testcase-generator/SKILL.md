---
name: testcase-generator
description: Sinh bộ test case đầy đủ từ một requirement / user story. Dùng Skill này khi người dùng yêu cầu "sinh test case", "thiết kế test case", "viết test case cho chức năng ...", "tạo bộ kiểm thử từ requirement", hoặc đưa một mô tả chức năng kèm yêu cầu kiểm thử.
---

# Testcase Generator

## Quy trình thực hiện
1. Đọc requirement, liệt kê lại từng ràng buộc một cách rõ ràng. Nếu có điểm mơ hồ hoặc thiếu ràng buộc, hỏi lại người dùng TRƯỚC khi sinh test case.
2. Sinh test case bao phủ đủ 3 nhóm, tối thiểu: 2 happy case, 2 edge case, 4 negative case.
3. Với mỗi ràng buộc nêu trong requirement, phải có ít nhất 1 negative case tương ứng.
4. Tự rà soát và bổ sung các case: vi phạm nhiều ràng buộc cùng lúc, thiếu field bắt buộc, sai kiểu dữ liệu (vd amount là chuỗi thay vì số).
5. Ghi kết quả ra file Markdown trong thư mục `plans/test/`, đặt tên theo chức năng (vd `transaction_expense_test_cases.md`).

## Định dạng bảng bắt buộc
```
| No | Mô tả | Bước thực hiện | Dữ liệu vào | Kết quả mong đợi |
```
Cột **Mô tả** phải bắt đầu bằng nhãn nhóm: `[Happy path]` / `[Edge case]` / `[Negative case]`.
Đánh số test case dạng `TC01`, `TC02`, ...