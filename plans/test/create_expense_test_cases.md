# Test case: Tạo khoản chi tiêu (Create Expense)

## Requirement & ràng buộc

Chức năng "Tạo khoản chi tiêu" trong app Quản lý chi tiêu.

| # | Ràng buộc |
|---|---|
| R1 | Số tiền (`amount`) phải **lớn hơn 0**. |
| R2 | Ngày chi tiêu (`spentAt`) **được phép ở tương lai** (không chặn). |
| R3 | Phải chọn một `categoryId` **tồn tại** trong hệ thống. Cho phép chọn category **parent hoặc child**. |
| R4 | Phải chọn một `accountId` **tồn tại** và **thuộc về user đang đăng nhập**. |
| R5 | `description` là trường **tùy chọn**, được phép bỏ trống / null. |

### Mapping sang API thực tế (`POST /transactions`, `docs/api-spec/transaction.yaml`)

| Field trong requirement | Field trong API | Ghi chú |
|---|---|---|
| `amount` | `amount` (PositiveAmount, chuỗi decimal ≤ 2 số lẻ) | |
| `spentAt` | `date` (date-time) | |
| `categoryId` | `categoryId` | với `type=EXPENSE` là bắt buộc; category phải có `type=EXPENSE` |
| `accountId` | `fromAccountId` | phải thuộc user đang login |
| `description` | `note` (nullable, maxLength 500) | |
| — | `type` | cố định `EXPENSE` cho chức năng này |

### Tiền đề dữ liệu (fixtures)
- User A đang đăng nhập, có `ACC_A1` (VND), `ACC_A2` (VND).
- User B có `ACC_B1` — **không** thuộc User A.
- Category EXPENSE: `CAT_PARENT` (parent, không có parentId), `CAT_CHILD` (child của `CAT_PARENT`).
- Category INCOME: `CAT_INCOME` (dùng cho case chọn sai loại category).
- `CAT_DELETED` — id có định dạng hợp lệ nhưng không tồn tại trong DB.

---

## Bảng test case

| No | Mô tả | Bước thực hiện | Dữ liệu vào | Kết quả mong đợi |
|---|---|---|---|---|
| TC01 | [Happy path] Tạo khoản chi tiêu hợp lệ đầy đủ field với category **child** | 1. Đăng nhập User A. 2. Gọi `POST /transactions`. | `{ type: "EXPENSE", amount: "150000.00", date: "2026-09-06T10:00:00Z", fromAccountId: "ACC_A1", categoryId: "CAT_CHILD", note: "Ăn trưa" }` | HTTP 201. Bản ghi được tạo, trả về `data` đúng giá trị đã gửi. Số dư `ACC_A1` **giảm** 150000. |
| TC02 | [Happy path] Tạo khoản chi tiêu hợp lệ, **không có** `description`, chọn category **parent** | 1. Đăng nhập User A. 2. Gọi `POST /transactions` không kèm `note`. | `{ type: "EXPENSE", amount: "20000", date: "2026-09-05T08:00:00Z", fromAccountId: "ACC_A2", categoryId: "CAT_PARENT" }` | HTTP 201. Bản ghi tạo thành công, `note = null`. Số dư `ACC_A2` giảm 20000. (R2, R3-parent, R5) |
| TC03 | [Happy path] `description` gửi rỗng/null tường minh | Đăng nhập User A, gọi API với `note: null`. | `{ type: "EXPENSE", amount: "5000", date: "2026-09-06T00:00:00Z", fromAccountId: "ACC_A1", categoryId: "CAT_CHILD", note: null }` | HTTP 201. `note = null`, không lỗi validation. (R5) |
| TC04 | [Edge case] `spentAt` ở **tương lai xa** | Đăng nhập User A, đặt `date` sau ngày hiện tại nhiều năm. | `{ type: "EXPENSE", amount: "99999999999999.99", date: "2030-01-01T00:00:00Z", fromAccountId: "ACC_A1", categoryId: "CAT_PARENT" }` | HTTP 201. Không bị chặn vì lý do "ngày tương lai". Số dư account cập nhật đúng. (R2, R1 biên trên) |
| TC05 | [Edge case] `amount` nhỏ nhất hợp lệ trên 0 (`0.01`) | Đăng nhập User A, gọi API. | `{ type: "EXPENSE", amount: "0.01", date: "2026-09-06T10:00:00Z", fromAccountId: "ACC_A1", categoryId: "CAT_CHILD" }` | HTTP 201. Tạo thành công, số dư giảm 0.01. (R1 biên dưới) |
| TC06 | [Edge case] `spentAt` = đúng thời điểm hiện tại (now) | Đăng nhập User A, `date` = timestamp hiện tại. | `{ type: "EXPENSE", amount: "12345.67", date: "<now ISO>", fromAccountId: "ACC_A2", categoryId: "CAT_PARENT" }` | HTTP 201. Tạo thành công. |
| TC07 | [Edge case] `description` dài đúng giới hạn 500 ký tự | Đăng nhập User A, `note` = chuỗi 500 ký tự. | `{ ..., note: "<500 chars>" }` | HTTP 201. Lưu đầy đủ 500 ký tự. |
| TC08 | [Edge case] `description` vượt 500 ký tự | Đăng nhập User A, `note` = chuỗi 501 ký tự. | `{ ..., note: "<501 chars>" }` | HTTP 400. Lỗi validation `note` quá dài. Không tạo bản ghi. |
| TC09 | [Edge case] `amount` có nhiều hơn 2 chữ số thập phân | Đăng nhập User A, gọi API. | `{ ..., amount: "100.005" }` | HTTP 400. Lỗi validation định dạng `amount` (tối đa 2 số lẻ). Không tạo bản ghi. |
| TC10 | [Negative case] `amount` = 0 | Đăng nhập User A, gọi API với amount bằng 0. | `{ type: "EXPENSE", amount: "0", date: "2026-09-06T10:00:00Z", fromAccountId: "ACC_A1", categoryId: "CAT_CHILD" }` | HTTP 400. Lỗi "số tiền phải lớn hơn 0". Không tạo bản ghi, số dư không đổi. (R1) |
| TC11 | [Negative case] `amount` âm | Đăng nhập User A, gọi API với amount âm. | `{ ..., amount: "-50000" }` | HTTP 400. Lỗi validation `amount` (không nhận số âm). Không tạo bản ghi. (R1) |
| TC12 | [Negative case] `amount` sai kiểu dữ liệu (chuỗi chữ) | Đăng nhập User A, gọi API. | `{ ..., amount: "abc" }` | HTTP 400. Lỗi định dạng `amount`. Không tạo bản ghi. (R1, sai kiểu) |
| TC13 | [Negative case] `amount` là số thay vì chuỗi decimal (kiểu JSON number) | Đăng nhập User A, gọi API. | `{ ..., amount: 150000 }` (number, không phải string) | HTTP 400 nếu API yêu cầu string decimal; hoặc xử lý nhất quán theo spec. Kết quả phải deterministic, có thông báo rõ ràng. |
| TC14 | [Negative case] `categoryId` không tồn tại | Đăng nhập User A, gọi API với category id không có trong DB. | `{ type: "EXPENSE", amount: "10000", date: "2026-09-06T10:00:00Z", fromAccountId: "ACC_A1", categoryId: "CAT_DELETED" }` | HTTP 400. Lỗi "category không tồn tại". Không tạo bản ghi. (R3) |
| TC15 | [Negative case] Thiếu `categoryId` (bắt buộc với EXPENSE) | Đăng nhập User A, gọi API không kèm `categoryId`. | `{ type: "EXPENSE", amount: "10000", date: "2026-09-06T10:00:00Z", fromAccountId: "ACC_A1" }` | HTTP 400. Lỗi thiếu field bắt buộc `categoryId`. Không tạo bản ghi. (R3, thiếu field) |
| TC16 | [Negative case] `categoryId` là category loại INCOME (không hợp loại với EXPENSE) | Đăng nhập User A, gọi API với category INCOME. | `{ ..., categoryId: "CAT_INCOME" }` | HTTP 400. Lỗi "category không thuộc loại EXPENSE". Không tạo bản ghi. (R3) |
| TC17 | [Negative case] `accountId` không tồn tại | Đăng nhập User A, gọi API với account id không có. | `{ ..., fromAccountId: "ACC_NONE", categoryId: "CAT_CHILD" }` | HTTP 400. Lỗi "account không tồn tại". Không tạo bản ghi. (R4) |
| TC18 | [Negative case] `accountId` thuộc user khác | Đăng nhập User A, gọi API với `fromAccountId` của User B. | `{ type: "EXPENSE", amount: "10000", date: "2026-09-06T10:00:00Z", fromAccountId: "ACC_B1", categoryId: "CAT_CHILD" }` | HTTP 404 không lộ tồn tại. Không tạo bản ghi, số dư `ACC_B1` không đổi. (R4) |
| TC19 | [Negative case] Thiếu `accountId` (`fromAccountId`) | Đăng nhập User A, gọi API không kèm `fromAccountId`. | `{ type: "EXPENSE", amount: "10000", date: "2026-09-06T10:00:00Z", categoryId: "CAT_CHILD" }` | HTTP 400. Lỗi thiếu field bắt buộc `fromAccountId`. Không tạo bản ghi. (R4, thiếu field) |
| TC20 | [Negative case] Thiếu `spentAt` (`date`) | Đăng nhập User A, gọi API không kèm `date`. | `{ type: "EXPENSE", amount: "10000", fromAccountId: "ACC_A1", categoryId: "CAT_CHILD" }` | HTTP 400. Lỗi thiếu field bắt buộc `date`. Không tạo bản ghi. (thiếu field) |
| TC21 | [Negative case] `spentAt` sai định dạng ngày | Đăng nhập User A, gọi API. | `{ ..., date: "06-09-2026" }` | HTTP 400. Lỗi định dạng date-time. Không tạo bản ghi. (sai kiểu) |
| TC22 | [Negative case] Chưa đăng nhập / thiếu token | Không gửi token, gọi `POST /transactions` với body hợp lệ. | Body hợp lệ như TC01, header không có API key. | HTTP 401 Unauthorized. Không tạo bản ghi. |
| TC23 | [Negative case] Vi phạm **nhiều ràng buộc cùng lúc**: `amount` = 0 + `categoryId` không tồn tại + `accountId` user khác | Đăng nhập User A, gọi API với body sai nhiều chỗ. | `{ type: "EXPENSE", amount: "0", date: "2026-09-06T10:00:00Z", fromAccountId: "ACC_B1", categoryId: "CAT_DELETED" }` | HTTP 400 (validation chặn trước — amount ≤ 0, category/account không hợp lệ). Không tạo bản ghi, không đổi số dư account nào. (R1+R3+R4) |
| TC24 | [Negative case] Body rỗng hoàn toàn | Đăng nhập User A, gọi `POST /transactions` với `{}`. | `{}` | HTTP 400. Liệt kê tất cả field bắt buộc còn thiếu (`type`, `amount`, `date`, `fromAccountId`, `categoryId`). Không tạo bản ghi. |
| TC25 | [Negative case] `description` sai kiểu dữ liệu (số thay vì chuỗi) | Đăng nhập User A, gọi API. | `{ ..., note: 12345 }` | HTTP 400. Lỗi kiểu dữ liệu `note` phải là chuỗi. Không tạo bản ghi. (R5, sai kiểu) |
| TC26 | [Negative case] `categoryId` thuộc user khác — với User A thì coi như **không tồn tại** | Đăng nhập User A, dùng category của User B. | `{ ..., categoryId: "CAT_B_EXPENSE" }` | HTTP 400. Lỗi "category không tồn tại". Không tạo bản ghi. (R3 — phân quyền) |
| TC27 | [Edge case] `amount` số cực lớn vượt khả năng lưu trữ của DB (tràn `DECIMAL`) | Đăng nhập User A, gọi API với `amount` lớn hơn precision cột `amount` trong DB (Prisma `Decimal`). | `{ type: "EXPENSE", amount: "999999999999999999999999999999.99", date: "2026-09-06T10:00:00Z", fromAccountId: "ACC_A1", categoryId: "CAT_CHILD" }` | HTTP 400. Backend validate và từ chối **trước khi** ghi DB, thông báo lỗi `amount` vượt giá trị cho phép. Không có exception 500 / lỗi tràn từ DB. Không tạo bản ghi, số dư `ACC_A1` không đổi. (R1) |

---

## Ghi chú rà soát

- **Bao phủ ràng buộc:** R1 → TC10, TC11, TC12, TC23, TC27; R2 → TC04, TC06 (khẳng định không bị chặn); R3 → TC14, TC15, TC16, TC23, TC26; R4 → TC17, TC18, TC19, TC23; R5 → TC02, TC03, TC08, TC25.
- **Happy:** TC01–TC03 (≥ 2). **Edge:** TC04–TC09, TC27 (≥ 2). **Negative:** TC10–TC26 (≥ 4).
- **Multi-violation:** TC23. **Thiếu field bắt buộc:** TC15, TC19, TC20, TC24. **Sai kiểu dữ liệu:** TC12, TC13, TC21, TC25.
- Quy ước mã lỗi đã chốt: tài nguyên tham chiếu không hợp lệ (`categoryId`/`fromAccountId` không tồn tại hoặc thuộc user khác) → **HTTP 400** (TC14, TC17, TC23, TC26). Riêng TC18 (`accountId` của user khác) giữ **404** để không lộ sự tồn tại của account.
- Với mọi negative case: phải khẳng định **không có bản ghi transaction mới** và **số dư account không thay đổi** (do create chạy trong `$transaction` Prisma).
