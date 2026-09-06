---
name: bugreport-writer
description: Soạn bug report hoàn chỉnh theo cấu trúc chuẩn từ một mô tả lỗi ngắn/thô. Dùng Skill này khi người dùng yêu cầu "viết bug report", "soạn bug report", "chuẩn hoá mô tả lỗi này", "tạo phiếu lỗi từ ghi chú", hoặc đưa một mô tả lỗi kèm yêu cầu báo cáo.
---

# Bug Report Writer

## Cấu trúc bắt buộc cho mỗi Bug (đủ 8 trường, đúng thứ tự)
1. **Tiêu đề** — 1 câu nêu đúng vấn đề, đủ nhận diện khi lướt danh sách bug.
2. **Mô tả** — lỗi là gì, ngữ cảnh nào, ảnh hưởng gì tới người dùng/hệ thống.
3. **Môi trường** — OS, runtime/version, DB, môi trường (local/dev/test/stg/prod), thời điểm phát hiện.
4. **Bước tái hiện** — danh sách đánh số, cụ thể, kèm body request mẫu nếu là lỗi API.
5. **Kết quả mong đợi** — hành vi đúng theo spec/test case.
6. **Kết quả thực tế** — hành vi sai đang xảy ra, trích dẫn nguyên văn từ log/response.
7. **Mức độ ưu tiên / Severity** — Critical/High/Medium/Low kèm 1 câu lý do.
8. **Ghi chú bổ sung** — log, nghi vấn nguyên nhân, gợi ý hướng fix (nếu đã phân tích).

## Quy tắc
- KHÔNG bịa thông tin môi trường/version. Nếu người dùng không cung cấp, để "(cần Tester bổ sung)".
- Severity ghi rõ là **đề xuất** — người quyết định cuối cùng là Tester/Lead QA.
- Nghi vấn nguyên nhân diễn đạt ở mức "nghi vấn: ..." nếu chưa kiểm chứng, không khẳng định chắc chắn.
- Xuất ra dạng bảng 2 cột: Trường | Nội dung.
- Luôn lấy spect từ testcase làm chuẩn. Nếu có mâu thuẫn giữa spect (requirement/testcase) so với API design hoặc hành vi thực tế, không tự ý sửa spect/testcase, mà ghi rõ trong Ghi chú bổ sung để Tester/Lead QA quyết định.