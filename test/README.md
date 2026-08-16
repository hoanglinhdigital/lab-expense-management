# Test API

Bộ test tích hợp cho backend: gọi API thật qua HTTP và đối chiếu với các bảng
test case trong `plans/backend/*.md`.

## Chạy

```bash
npm run dev            # terminal 1
npm run test:api       # terminal 2
```

Server không chạy ở port mặc định thì trỏ lại bằng biến môi trường:

```bash
API_BASE_URL=http://localhost:3005/api npm run test:api
```

Chạy riêng một module (runner tự kéo theo các module phụ thuộc):

```bash
node test/run.mjs account
node test/run.mjs transaction report
```

## Cấu trúc

```
test/
  run.mjs                        # runner: thứ tự, phụ thuộc, tổng kết
  lib/
    client.mjs                   # HTTP client, mỗi user một cookie jar riêng
    context.mjs                  # fixture dùng chung giữa các module
    reporter.mjs                 # đếm pass/fail, tổng kết theo module
  auth/auth.test.mjs             # A1–A14
  currency/currency.test.mjs     # G1–G14
  account/account.test.mjs       # B1–B21
  category/category.test.mjs     # C1–C24
  contact/contact.test.mjs       # D1–D15
  transaction/transaction.test.mjs  # E1–E32
  report/report.test.mjs         # H1–H32
```

Mã test case (A1, B15, H23...) khớp với bảng test case trong plan tương ứng, tra
ngược lại được khi có case fail.

## Hai điểm cần biết trước khi sửa

**Các module dùng chung dữ liệu.** Bộ test chạy trên database thật chứ không mock,
nên transaction cần account/category/contact có sẵn, report cần transaction có
sẵn. Fixture được ghi vào `ctx` (xem `lib/context.mjs`) và module sau đọc lại.
Thứ tự trong mảng `MODULES` của `run.mjs` vì thế không hoán đổi được.

**Một số test case chạy ở lượt hai.** Những ràng buộc chỉ có nghĩa khi đã tồn tại
giao dịch — xoá account còn giao dịch (B15), khoá đổi tiền tệ (B12), tổng công nợ
của contact (D8) — nằm trong hàm `runAfterTransactions` của chính module đó.
Runner gọi chúng ngay sau khi module transaction chạy xong.

## Dữ liệu test

Mỗi lần chạy sinh user mới với email gắn timestamp, nên chạy lại nhiều lần trên
cùng một database không đụng ràng buộc trùng tên.

Dữ liệu **không** được dọn sau khi chạy: giữ lại để soi khi có case fail. Muốn
làm sạch thì reset database rồi seed lại:

```bash
npx prisma migrate reset
```

Chỉ chạy bộ test này ở môi trường dev.
