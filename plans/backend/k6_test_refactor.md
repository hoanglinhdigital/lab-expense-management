# Plan: Tái cấu trúc bộ test API sang định dạng Grafana k6

## 1. Mục tiêu

Chuyển toàn bộ test script trong `test/` từ runner tự viết (`node test/run.mjs`) sang
định dạng **Grafana k6**, sao cho **mỗi file test chạy độc lập** được bằng:

```bash
k6 run test/auth/auth.test.js
k6 run test/transaction/transaction.test.js
k6 run test/all.test.js          # chạy toàn bộ theo thứ tự
```

Giữ nguyên 100% nội dung kiểm chứng (mã test case A1–A14, B1–B21, C1–C24, D1–D15,
E1–E32, G1–G14, H1–H32) để vẫn tra ngược được về bảng test case trong `plans/backend/*.md`.

Môi trường: k6 v2.2.0 (đã cài, `k6 version` OK).

## 2. Khác biệt kỹ thuật khi chuyển sang k6

| Hiện tại (Node) | k6 |
|---|---|
| `fetch()` + `await` | `http.request()` — **đồng bộ**, bỏ toàn bộ `async/await` |
| Cookie jar tự cài bằng `Map` | `new http.CookieJar()`, truyền qua `params.jar` |
| `reporter.check(id, ok, detail)` | `check(val, { [id]: () => ok })` của `k6` |
| `run.mjs` gom module + resolve `deps` | Mỗi file tự bootstrap fixture nó cần; `all.test.js` gom lại |
| `process.exit(reporter.summary())` | `thresholds: { checks: ['rate==1.00'] }` → k6 exit code ≠ 0 khi có check fail |
| `import ... from "./x.mjs"` | `import ... from "./x.js"` (k6 không nhận `.mjs`) |
| `API_BASE_URL` env | `__ENV.API_BASE_URL`, truyền bằng `k6 run -e API_BASE_URL=...` |

**Điểm thiết kế quan trọng — bỏ cơ chế `deps` + `ctx` dùng chung.**
Hiện tại module sau đọc fixture do module trước ghi vào `ctx`, nên không chạy lẻ được.
Trong k6 mỗi file là một script độc lập, vì vậy fixture được đóng thành **hàm bootstrap
tái sử dụng** trong `test/lib/fixtures.js`. Mỗi file test gọi đúng những bootstrap nó cần:

- `auth.test.js` → không cần gì
- `currency.test.js` → `bootstrapAuth()`
- `account.test.js` / `category.test.js` / `contact.test.js` → `bootstrapAuth()`
- `transaction.test.js` → `bootstrapAuth()` + `bootstrapAccounts()` + `bootstrapCategories()` + `bootstrapContacts()`
- `report.test.js` → tất cả các bootstrap trên + `bootstrapTransactions()`

Hệ quả: chạy lẻ một file vẫn tốn vài request dựng dữ liệu, nhưng đổi lại `k6 run <file>`
luôn chạy được — đúng yêu cầu.

**Phần `runAfterTransactions` được giữ nguyên ý nghĩa.** Các case chỉ đúng khi đã có giao
dịch (B12, B15, B17–B21, C21–C23, D8, D9, D13) được export thành `runAfterTransactions(ctx)`
trong chính module đó. Khi chạy lẻ `account.test.js`, file tự gọi `bootstrapTransactions()`
rồi chạy tiếp phần này. Khi chạy `all.test.js`, runner gọi đúng sau module transaction —
không dựng lại dữ liệu lần hai.

**Số dư dùng số thực.** Các check so sánh `balanceOf()` giữ nguyên logic cộng/trừ; riêng
so sánh tiền tệ USD vẫn dùng ngưỡng sai số `< 0.001` như bản cũ.

## 3. Hạng mục công việc

### Thêm file

- `test/lib/http.js` — `BASE_URL` từ `__ENV.API_BASE_URL`, `makeClient(label)` dựng client
  có `http.CookieJar()` riêng, hàm `call(method, path, body)` trả `{ status, body, headers }`;
  gọi `http.setResponseCallback(http.expectedStatuses({min:200,max:599}))` để 4xx mong đợi
  không bị đếm vào `http_req_failed`.
- `test/lib/options.js` — `baseOptions`: `vus:1`, `iterations:1`, `thresholds:{ checks:['rate==1.00'], http_req_failed:['rate==0'] }`.
- `test/lib/expect.js` — wrapper `expect(id, ok, detail)` bọc `check()` của k6, giữ đúng chữ ký
  `check(id, ok, detail)` của bản cũ để phần thân test gần như không phải viết lại; in
  `FAIL <id> <detail>` bằng `console.error` khi fail.
- `test/lib/fixtures.js` — `createContext()` + các bootstrap: `bootstrapAuth`, `bootstrapAccounts`,
  `bootstrapCategories`, `bootstrapContacts`, `bootstrapTransactions`. Mỗi bootstrap idempotent
  trong một lần chạy (đã dựng thì bỏ qua).
- `test/auth/auth.test.js` — A1–A14 + `export default`.
- `test/currency/currency.test.js` — G1–G14 + `export default`.
- `test/account/account.test.js` — B1–B21 (`run` + `runAfterTransactions`) + `export default`.
- `test/category/category.test.js` — C1–C24 + `export default`.
- `test/contact/contact.test.js` — D1–D15 + `export default`.
- `test/transaction/transaction.test.js` — E1–E32 + `export default`.
- `test/report/report.test.js` — H1–H32 + `export default`.
- `test/all.test.js` — chạy 7 module theo đúng thứ tự cũ, xử lý pha `runAfterTransactions`.

### Sửa file

- `test/README.md` — viết lại phần "Chạy" và "Cấu trúc" theo k6, bỏ mô tả cơ chế `deps`/`ctx`,
  thêm ghi chú về `-e API_BASE_URL` và exit code từ threshold.
- `package.json` — `test:api` đổi thành `k6 run test/all.test.js`.

### Xóa file

- `test/run.mjs`
- `test/lib/client.mjs`, `test/lib/context.mjs`, `test/lib/reporter.mjs`
- `test/auth/auth.test.mjs`, `test/currency/currency.test.mjs`, `test/account/account.test.mjs`,
  `test/category/category.test.mjs`, `test/contact/contact.test.mjs`,
  `test/transaction/transaction.test.mjs`, `test/report/report.test.mjs`

## 4. Checklist

- [x] Tạo `test/lib/http.js`
- [x] Tạo `test/lib/options.js`
- [x] Tạo `test/lib/expect.js`
- [x] Tạo `test/lib/fixtures.js`
- [x] Chuyển `auth.test.mjs` → `auth/auth.test.js` (A1–A14)
- [x] Chuyển `currency.test.mjs` → `currency/currency.test.js` (G1–G14)
- [x] Chuyển `account.test.mjs` → `account/account.test.js` (B1–B21)
- [x] Chuyển `category.test.mjs` → `category/category.test.js` (C1–C24)
- [x] Chuyển `contact.test.mjs` → `contact/contact.test.js` (D1–D15)
- [x] Chuyển `transaction.test.mjs` → `transaction/transaction.test.js` (E1–E32)
- [x] Chuyển `report.test.mjs` → `report/report.test.js` (H1–H32)
- [x] Tạo `test/all.test.js`
- [x] Xoá các file `.mjs` cũ
- [x] Cập nhật `test/README.md`
- [x] Cập nhật script `test:api` trong `package.json`
- [x] Verify: `npm run dev` rồi `k6 run test/all.test.js` — toàn bộ check pass
- [x] Verify: chạy lẻ từng file `k6 run test/<module>/<module>.test.js` — pass độc lập
- [x] Verify: `npm run lint` và soát `git diff`

## 5. Test case cần kiểm chứng sau khi chuyển

Không thêm case mới. Điều kiện nghiệm thu:

1. `k6 run test/all.test.js` → `checks_total` bằng tổng số check của bản cũ, `checks_succeeded` 100%, exit code 0.
2. Từng file chạy lẻ đều exit code 0.
3. Khi có check fail, k6 exit code ≠ 0 (nhờ threshold `checks: rate==1.00`) — bảo đảm CI bắt được lỗi.
