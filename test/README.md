# Test API

Bộ test tích hợp cho backend: gọi API thật qua HTTP và đối chiếu với các bảng
test case trong `plans/backend/*.md`. Chạy bằng [Grafana k6](https://k6.io).

## Chạy

```bash
npm run dev            # terminal 1
npm run test:api       # terminal 2 — tương đương `k6 run test/all.test.js`
```

Chạy riêng một module — mỗi file là một script k6 độc lập:

```bash
npm run test:account            # hoặc: k6 run test/account/account.test.js
npm run test:transaction
k6 run test/report/report.test.js
```

Server không chạy ở port mặc định (`http://localhost:3000/api`) thì trỏ lại bằng
biến `-e` của k6:

```bash
k6 run -e API_BASE_URL=http://localhost:3005/api test/all.test.js
```

Không có `k6` trong PATH thì cài theo hướng dẫn tại <https://grafana.com/docs/k6/latest/set-up/install-k6/>.

## Cấu trúc

```
test/
  all.test.js                    # chạy trọn bộ 7 module theo đúng thứ tự
  lib/
    http.js                      # HTTP client, mỗi user một cookie jar riêng
    fixtures.js                  # context + các hàm bootstrap dữ liệu nền
    expect.js                    # bọc check() của k6, giữ mã test case làm tên
    options.js                   # options + threshold dùng chung
  auth/auth.test.js              # A1–A14
  currency/currency.test.js      # G1–G14
  account/account.test.js        # B1–B21
  category/category.test.js      # C1–C24
  contact/contact.test.js        # D1–D15
  transaction/transaction.test.js  # E1–E32
  report/report.test.js          # H1–H32
```

Mã test case (A1, B15, H23...) là tên check hiện trong summary của k6 và khớp với
bảng test case trong plan tương ứng, tra ngược lại được khi có case fail. Khi một
check fail, dữ liệu thực tế được in ra ở dòng `FAIL <mã> <chi tiết>`.

## Ba điểm cần biết trước khi sửa

**Kết quả nằm ở threshold, không ở exit code của từng check.** `lib/options.js`
đặt `checks: ['rate==1.00']`, nên chỉ cần một case fail là `k6 run` trả exit code
99. Đừng bỏ threshold này — mất nó thì k6 vẫn exit 0 dù test hỏng.

**Các module dùng chung dữ liệu.** Bộ test chạy trên database thật chứ không mock,
nên transaction cần account/category/contact có sẵn, report cần transaction có
sẵn. Dữ liệu nền được đóng thành các hàm `bootstrap*()` trong `lib/fixtures.js`:
chạy lẻ thì file test tự gọi bootstrap nó cần, chạy `all.test.js` thì module trước
đã dựng nên bootstrap thấy cờ trong `ctx.ready` và bỏ qua. Nhờ vậy cả hai cách
chạy đều đối chiếu trên cùng một bộ số.

**Một số test case chạy ở lượt hai.** Những ràng buộc chỉ có nghĩa khi đã tồn tại
giao dịch — xoá account còn giao dịch (B15), khoá đổi tiền tệ (B12), tổng công nợ
của contact (D8) — nằm trong hàm `runAfterTransactions` của chính module đó.

## Khác biệt so với runtime Node

k6 chạy trên goja chứ không phải V8, hai điểm đã phải viết khác:

- **Không có `Intl`.** H29 (tuần bắt đầu từ Thứ Hai) tính thứ theo giờ Việt Nam
  bằng offset cố định `+07:00` — Việt Nam không có giờ mùa hè nên luôn đúng.
- **Không có `async/await` cho HTTP.** `http.request()` của k6 là đồng bộ, mọi
  lời gọi API trả kết quả ngay.

## Dữ liệu test

Mỗi lần chạy sinh user mới với email gắn timestamp, nên chạy lại nhiều lần trên
cùng một database không đụng ràng buộc trùng tên.

Dữ liệu **không** được dọn sau khi chạy: giữ lại để soi khi có case fail. Muốn
làm sạch thì reset database rồi seed lại:

```bash
npx prisma migrate reset
```

Chỉ chạy bộ test này ở môi trường dev.
