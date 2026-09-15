# Plan Backend — Expense Analysis (tab Report)

Nguồn: `docs/api-spec/report.yaml` (đã cập nhật, xem mục 1). Phụ thuộc: plan 03 (category),
plan 05 (transaction), plan 07 (report — `getExpenseByCategory` đã tồn tại).

## 1. Thay đổi API (đã duyệt)

`GET /api/report/expense-by-category` — thêm param `parentId` (optional, query string):

| Trường hợp | Hành vi |
|---|---|
| Không truyền `parentId` | Giữ nguyên hành vi hiện tại: gom theo danh mục cha level 1. Dùng cho donut chính của màn Expense Analysis. |
| Có truyền `parentId` | Chỉ tính giao dịch thuộc cây danh mục của `parentId`, gom theo **danh mục con trực tiếp**. Giao dịch gắn thẳng vào `parentId` (không qua danh mục con) gom vào item `categoryId = parentId`. Dùng cho màn chi tiết theo danh mục cha (vd "Chi tiêu Cố định" → Cafe / Ăn trưa / Ăn sáng). |

Không có endpoint mới, không sửa `prisma/schema.prisma`, không có migration. Danh sách giao dịch của
từng danh mục con dùng thẳng `GET /transactions?categoryId=<childId>&dateFrom=&dateTo=` đã có sẵn
(plan 05) — không cần sửa gì ở `transaction.yaml`/`transaction.service.ts`.

## 2. Chi tiết implement `getExpenseByCategory`

File: `src/lib/services/report.service.ts`.

Nhánh mới khi `query.parentId` có giá trị (đặt trước nhánh gom level-1 hiện tại):

1. **Validate `parentId`**: tìm category bằng `readableWhere(userId)` (helper đã có ở
   `category.service.ts`, cho phép cả category `SYSTEM` lẫn của chính user) + `id: parentId` +
   `isDeleted: false`. Không thấy → `404 NOT_FOUND`, `details.parentId`. Thấy nhưng
   `category.parentId !== null` (không phải level 1) → cũng `404 NOT_FOUND`, `details.parentId`
   với message "Danh mục không phải danh mục cấp 1." — tái dùng response `NotFound` có sẵn trong spec,
   không cần thêm mã lỗi mới.
2. **Tập id cần lọc**: `childIds = await expandCategoryIds(userId, parentId)` (helper đã có, trả về id
   các danh mục con trực tiếp — category chỉ cho lồng **một cấp** nên không cần đệ quy).
   `subtreeIds = [parentId, ...childIds]`.
3. **Truy vấn**: `groupBy(['categoryId', 'fromAccountId'])` như nhánh hiện tại nhưng thêm điều kiện
   `categoryId: { in: subtreeIds }` vào `where`, cùng `flow`, kỳ, `accountId` filter như cũ.
4. **Gom nhóm**: vì tối đa 2 cấp, `row.categoryId` chính là group key (không cần map `rootOf` như nhánh
   level-1) — `row.categoryId === parentId` nghĩa là giao dịch gắn thẳng vào danh mục cha.
5. **Thông tin hiển thị** (`name`/`icon`/`color`): lấy từ `prisma.category.findMany({ where: { id: {
   in: subtreeIds } } })`, y hệt cách nhánh cũ đang làm với `categoryIds`.
6. Phần còn lại (tính `totalAmount`, `percentage`, sort giảm dần theo `amount`, phân trang) **dùng
   chung** logic đã có — không viết lại.

Không có mục nào trong `subtreeIds` bị bỏ sót dù không phát sinh giao dịch — theo đúng hành vi hiện tại
của endpoint, chỉ trả các mục **có** giao dịch trong kỳ (giống nhánh level-1, không giống
`/expense-analysis` là phải đủ mốc trục X).

## 3. Schema zod

File: `src/lib/api/schemas/report.schema.ts` — thêm field `parentId: z.string().optional()` vào
`expenseByCategoryQuerySchema`. Không validate format id ở tầng schema (để service tự query rồi trả
`404` nếu không tồn tại, nhất quán với cách `accountId`/`categoryId` của các endpoint khác trong file
này đang làm).

## 4. Route handler

File: `src/app/api/report/expense-by-category/route.ts` — đọc thêm `parentId` từ `searchParams`, truyền
xuống `getExpenseByCategory`. Không đổi cấu trúc response, không đổi cách xử lý lỗi (lỗi `404` đã có
sẵn cơ chế throw từ `category.service.ts` được route layer bắt và map sang response chuẩn, giống các
endpoint khác).

## 5. Test case

| # | Tình huống | Kỳ vọng |
|---|---|---|
| T1 | `?parentId=<cha có 3 con, mỗi con có giao dịch>` | 3 item, mỗi item `categoryId` = id con tương ứng, `name`/`icon`/`color` đúng danh mục con |
| T2 | `?parentId=<cha>` khi có giao dịch gắn thẳng vào cha (không qua con) | Có thêm 1 item `categoryId = parentId`, `name` = tên danh mục cha |
| T3 | `?parentId=<cha>` khi một con không phát sinh giao dịch trong kỳ | Con đó **không** xuất hiện trong `data` (giống hành vi level-1 hiện tại) |
| T4 | `?parentId=<id không tồn tại>` | `404 NOT_FOUND`, `details.parentId` |
| T5 | `?parentId=<id của danh mục con, không phải cấp 1>` | `404 NOT_FOUND`, `details.parentId` |
| T6 | `?parentId=<danh mục của user khác>` | `404 NOT_FOUND` (không lộ thông tin tồn tại hay không) |
| T7 | `?parentId=<cha>` kèm `dateFrom`/`dateTo`/`accountId`/`flow` | Áp dụng đúng như nhánh level-1 |
| T8 | `?parentId=<cha>` — tổng `percentage` của các item trả về | ≈ 100 trên tổng `meta.totalAmount` của riêng nhóm con này (không phải tổng toàn bộ chi tiêu) |
| T9 | Không truyền `parentId` | Hành vi y hệt trước khi có thay đổi này (regression) |

## 6. Hạng mục

### Thêm file

- (không có — chỉ mở rộng file/hàm đã tồn tại)

### Sửa file

- [x] `docs/api-spec/report.yaml` — đã cập nhật.
- [x] `src/lib/api/schemas/report.schema.ts` — thêm `parentId` vào `expenseByCategoryQuerySchema`
- [x] `src/lib/services/report.service.ts` — nhánh `parentId` trong `getExpenseByCategory`
- [x] `src/app/api/report/expense-by-category/route.ts` — không cần sửa, `parentId` đã đi qua
      `parseQuery`/schema sẵn có, route truyền nguyên `query` xuống service.

### Xóa file

- Không có.

### Verify

- [x] `npm run lint`
- [x] `npm run build`
- [x] Kiểm bằng tay qua UI (T1, T2 — xem mục kiểm thử ở plan frontend): tạo danh mục con "Ăn sáng" dưới
      "Ăn uống", ghi 1 giao dịch vào "Ăn sáng" và 1 giao dịch thẳng vào "Ăn uống" — màn chi tiết trả
      đúng 2 dòng, đúng tên/số tiền từng dòng.
- [ ] Chưa viết test script tự động T1–T9 (k6/http) — để lại cho lần sau nếu cần coverage tự động, hiện
      đã kiểm bằng tay qua UI thật.
- [x] `npx prisma migrate dev` — không cần, không đổi schema.
