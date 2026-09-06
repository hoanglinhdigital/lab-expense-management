# Bug Report — Create Expense (POST /api/transactions, type=EXPENSE)

- **Nguồn test**: `test/transaction/expense/testscript.js` (TC01–TC27)
- **Log**: `test/transaction/expense/output-log-production_20260906_1820.log`
- **Kết quả run**: 19/27 PASS, 8 FAIL (`checks` rate = 70.37%)
- **Thời điểm phát hiện**: 2026-09-06 ~18:20 (giờ máy chạy test)

## Tổng quan 8 case FAIL

| TC | Tên | Kết luận |
|---|---|---|
| TC01 | [Happy] Tạo chi tiêu đầy đủ field, category child | **BUG-01** — số dư không bị trừ |
| TC05 | [Edge] amount = 0.01 | **BUG-01** — số dư không bị trừ |
| TC21 | [Negative] date = "06-09-2026" sai định dạng ISO | **BUG-02** — chấp nhận date sai định dạng |
| TC13 | [Negative] amount là number thay vì chuỗi decimal | **BUG-03** — không validate kiểu `amount` |
| TC14 | [Negative] categoryId không tồn tại | **BUG-04** — trả 404 thay vì 400 |
| TC17 | [Negative] fromAccountId không tồn tại | **BUG-04** — trả 404 thay vì 400 |
| TC18 | [Negative] fromAccountId là account của user B | **BUG-04** — trả 404 thay vì 400 |
| TC26 | [Negative] categoryId là category của user B | **BUG-04** — trả 404 thay vì 400 |

> **Chuẩn đối chiếu**: lấy **test case** (`plans/test/create_expense_test_cases.md` / `testscript.js`) làm chuẩn. `docs/api-spec/transaction.yaml` chỉ là bản thiết kế API tham khảo, **không dùng làm cơ sở PASS/FAIL**.

---

## BUG-01 — Tạo chi tiêu thành công (HTTP 201) nhưng số dư nguồn tiền KHÔNG bị trừ khi `amount` có phần thập phân

| Trường | Nội dung |
|---|---|
| **Tiêu đề** | Tạo giao dịch EXPENSE với `amount` dạng "150000.00" hoặc "0.01" trả 201 nhưng `currentBalance` của `fromAccount` không thay đổi |
| **Mô tả** | Khi POST `/api/transactions` tạo khoản chi có `amount` chứa phần thập phân (vd `"150000.00"`, `"0.01"`), API trả `201` và bản ghi giao dịch được tạo, nhưng số dư của `fromAccount` không bị trừ. Các case dùng `amount` là số nguyên dạng chuỗi không có dấu chấm (TC02 `"20000"`, TC03/TC07 `"5000"`) lại trừ số dư đúng. Đây là lỗi toàn vẹn dữ liệu ở chức năng lõi: sổ giao dịch và số dư account lệch nhau, người dùng thấy đã chi tiền nhưng số dư vẫn nguyên. |
| **Môi trường** | Production — `https://claude101expensemanagement.vercel.app/api`; hosting Vercel; DB TiDB Cloud (MySQL 8.x compatible); test bằng Grafana k6 (local runner). Phát hiện 2026-09-06 ~18:20. Runtime/version Node cụ thể: (cần Tester bổ sung). |
| **Bước tái hiện** | 1. Đăng nhập user A, có account VND `accA1` số dư ~99,845,925.98.<br>2. POST `/api/transactions` với body:<br>`{ "type":"EXPENSE", "amount":"150000.00", "date":"2026-09-06T10:00:00Z", "fromAccountId":"<accA1>", "categoryId":"<childCat>", "note":"Ăn trưa" }`<br>3. Chờ vài giây (đã retry đọc số dư 8 lần × 0.8s).<br>4. GET `/api/accounts/<accA1>/balance`.<br>Biến thể: lặp lại với `amount":"0.01"` (TC05). |
| **Kết quả mong đợi** | HTTP 201; số dư `accA1` giảm đúng bằng `amount`: 99,845,925.98 → 99,695,925.98 (TC01); 99,845,925.98 → 99,845,925.97 (TC05). |
| **Kết quả thực tế** | TC01 — `actual : HTTP 201 \| note="Ăn trưa"; số dư → 99,845,925.98` (không đổi).<br>TC05 — `expected : số dư → 99,845,925.97` / `actual : HTTP 201 \| số dư → 99,845,925.98` (không đổi). |
| **Mức độ ưu tiên / Severity (đề xuất)** | **Critical** — chức năng lõi, sai lệch số dư/sổ sách trên môi trường production; người quyết định cuối là Tester/Lead QA. |
| **Ghi chú bổ sung** | Nghi vấn: (a) chuỗi `amount` có phần thập phân bị parse sai (vd `parseInt`, hoặc convert Decimal → Number làm mất giá trị) trong bước cập nhật số dư; hoặc (b) bước tính lại/ghi `currentBalance` không nằm cùng `$transaction` với việc tạo giao dịch và bị bỏ qua với nhánh có phần thập phân; hoặc (c) độ trễ read-after-write của TiDB — nhưng script đã retry ~6.4s nên khả năng thấp. Đề xuất: kiểm tra route handler `POST /transactions` phần cập nhật balance, so sánh nhánh xử lý `amount` nguyên vs thập phân; kiểm tra kiểu cột balance và phép cộng/trừ Decimal. Cần xác nhận bản ghi giao dịch TC01/TC05 có thực sự được lưu với `amount` đúng không (GET danh sách giao dịch). |

---

## BUG-02 — `date` sai định dạng ISO 8601 vẫn được chấp nhận và bị diễn giải sai

| Trường | Nội dung |
|---|---|
| **Tiêu đề** | POST `/api/transactions` chấp nhận `date="06-09-2026"` (không phải ISO date-time), trả 201 và lưu thành `2026-06-09` |
| **Mô tả** | Spec `transaction.yaml` quy định `date` là `format: date-time` (ISO 8601 UTC). Gửi chuỗi `"06-09-2026"` không đúng định dạng, API không trả `400` mà tạo giao dịch với `date=2026-06-09T00:00:00.000Z` — hiểu nhầm ngày người dùng định nhập (06/09/2026) thành tháng 6 ngày 9. Gây sai lệch ngày giao dịch, ảnh hưởng báo cáo/lọc theo thời gian. |
| **Môi trường** | Như BUG-01 (production, Vercel, TiDB Cloud, 2026-09-06 ~18:20). |
| **Bước tái hiện** | 1. Đăng nhập user A.<br>2. POST `/api/transactions`:<br>`{ "type":"EXPENSE", "amount":"10000", "date":"06-09-2026", "fromAccountId":"<accA1>", "categoryId":"<childCat>" }` |
| **Kết quả mong đợi** | HTTP 400, `error.details.date` báo lỗi định dạng date-time. |
| **Kết quả thực tế** | `actual : HTTP 201 \| data.date=2026-06-09T00:00:00.000Z` |
| **Mức độ ưu tiên / Severity (đề xuất)** | **High** — không phải crash nhưng là lỗi toàn vẹn dữ liệu âm thầm (ngày giao dịch sai), khó phát hiện khi dùng thật; người quyết định cuối là Tester/Lead QA. |
| **Ghi chú bổ sung** | Nghi vấn: schema validation cho `date` chỉ dùng `new Date(str)` / `z.coerce.date()` — vốn parse lỏng nhiều định dạng — thay vì ràng buộc chuỗi ISO 8601 (`z.string().datetime()` hoặc regex). Đề xuất siết validation `date` về đúng ISO 8601 date-time và từ chối phần còn lại. |

---

## BUG-03 — `amount` truyền dạng JSON number không bị từ chối

| Trường | Nội dung |
|---|---|
| **Tiêu đề** | POST `/api/transactions` chấp nhận `amount` là number (`150000`) thay vì chuỗi decimal, trả 201 |
| **Mô tả** | Spec định nghĩa `amount` là `PositiveAmount` = **string** (`pattern: '^\d{1,16}(\.\d{1,2})?$'`). Khi client gửi `amount` là JSON number, API không validate kiểu và vẫn tạo giao dịch. Rủi ro: number lớn/nhiều thập phân bị mất chính xác khi qua float, không nhất quán với hợp đồng API. |
| **Môi trường** | Như BUG-01. |
| **Bước tái hiện** | 1. Đăng nhập user A.<br>2. POST `/api/transactions`:<br>`{ "type":"EXPENSE", "amount":150000, "date":"2026-09-06T10:00:00Z", "fromAccountId":"<accA1>", "categoryId":"<childCat>" }` (amount **không** có dấu ngoặc kép). |
| **Kết quả mong đợi** | HTTP 400 — `amount` phải là chuỗi decimal. |
| **Kết quả thực tế** | `actual : HTTP 201` |
| **Mức độ ưu tiên / Severity (đề xuất)** | **Medium** — lệch hợp đồng API và rủi ro độ chính xác số tiền; chưa thấy hậu quả trực tiếp trong log. Người quyết định cuối là Tester/Lead QA. |
| **Ghi chú bổ sung** | Nghi vấn: schema dùng `z.coerce`/`z.union([string, number])` cho `amount`. Đề xuất chỉ nhận `z.string().regex(...)` đúng như spec. Liên quan BUG-01: nếu tồn tại hai nhánh xử lý number vs string thì nên hợp nhất. |

---

## BUG-04 — `categoryId` / `fromAccountId` không hợp lệ trả HTTP 404 thay vì 400 như test case yêu cầu

| Trường | Nội dung |
|---|---|
| **Tiêu đề** | POST `/api/transactions` trả `404` (CATEGORY_NOT_FOUND / ACCOUNT_NOT_FOUND) khi `categoryId` hoặc `fromAccountId` không tồn tại / thuộc user khác — test case yêu cầu `400` |
| **Mô tả** | Theo bộ test case (chuẩn đối chiếu), khi `categoryId` hoặc `fromAccountId` trong body là id không tồn tại, hoặc là tài nguyên của user khác, API phải coi đây là dữ liệu đầu vào không hợp lệ và trả **HTTP 400** (`VALIDATION_ERROR`, có `error.details` chỉ rõ field sai). Thực tế API trả **HTTP 404** với `error.code` là `CATEGORY_NOT_FOUND` / `ACCOUNT_NOT_FOUND`. Hệ quả: client xử lý lỗi theo status 400 (hiển thị lỗi field trên form) sẽ không bắt được, dễ hiểu nhầm là "không tìm thấy trang / tài nguyên". Ảnh hưởng 4 test case: TC14, TC17, TC18, TC26. |
| **Môi trường** | Production — `https://claude101expensemanagement.vercel.app/api`; hosting Vercel; DB TiDB Cloud (MySQL 8.x compatible); test bằng Grafana k6 (local runner). Phát hiện 2026-09-06 ~18:20. Runtime/version Node cụ thể: (cần Tester bổ sung). |
| **Bước tái hiện** | Đăng nhập user A, sau đó POST `/api/transactions` với từng body:<br>**TC14** — `categoryId` không tồn tại:<br>`{ "type":"EXPENSE", "amount":"10000", "date":"2026-09-06T10:00:00Z", "fromAccountId":"<accA1>", "categoryId":"clnonexist0000000000000000" }`<br>**TC17** — `fromAccountId` không tồn tại:<br>`{ "type":"EXPENSE", "amount":"10000", "date":"2026-09-06T10:00:00Z", "fromAccountId":"clnonexist0000000000000000", "categoryId":"<childCat>" }`<br>**TC18** — `fromAccountId` là account của user B:<br>`{ ..., "fromAccountId":"<accB1>", "categoryId":"<childCat>" }`<br>**TC26** — `categoryId` là category của user B:<br>`{ ..., "fromAccountId":"<accA1>", "categoryId":"<catOfB>" }` |
| **Kết quả mong đợi** | HTTP **400** (theo test case). Với TC18, số dư account B không đổi. |
| **Kết quả thực tế** | TC14 — `HTTP 404 \| error.code=CATEGORY_NOT_FOUND`<br>TC17 — `HTTP 404 \| error.code=ACCOUNT_NOT_FOUND`<br>TC18 — `HTTP 404 \| error.code=ACCOUNT_NOT_FOUND \| số dư B 1,000,000 → 1,000,000`<br>TC26 — `HTTP 404 \| error.code=CATEGORY_NOT_FOUND` |
| **Mức độ ưu tiên / Severity (đề xuất)** | **Medium** — hành vi bảo mật/số dư vẫn an toàn (không tạo được giao dịch, số dư user B không đổi), nhưng sai HTTP status so với hợp đồng test khiến client khó xử lý lỗi nhất quán. Người quyết định cuối là Tester/Lead QA. |
| **Ghi chú bổ sung** | Test case coi id tham chiếu sai là lỗi validation (400); code hiện phân tách "not found" thành 404. `docs/api-spec/transaction.yaml` mô tả 404/403 cho trường hợp này — nhưng theo yêu cầu, **spec không dùng làm chuẩn**, lấy test case. Đề xuất: BE trả `400 VALIDATION_ERROR` kèm `error.details.categoryId` / `error.details.fromAccountId` cho mọi id tham chiếu không thuộc user đang đăng nhập (gộp cả "không tồn tại" và "của user khác" về cùng 400 để không lộ sự tồn tại tài nguyên). Nếu team muốn giữ 404, cần điều chỉnh lại test case và thống nhất bằng văn bản. |

---

## Đề xuất thứ tự xử lý

1. **BUG-01 (Critical)** — chặn release, cần fix ngay.
2. **BUG-02 (High)** — siết validation `date`.
3. **BUG-03 (Medium)** — siết validation kiểu `amount`.
4. **BUG-04 (Medium)** — chuẩn hoá lỗi id tham chiếu không hợp lệ về HTTP 400 (TC14, TC17, TC18, TC26).
