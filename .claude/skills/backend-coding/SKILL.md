---
name: backend-coding
description: Áp dụng khi viết hoặc sửa API route, business logic, hoặc câu query database phía server trong project này.
---

# Backend coding rules — lab-expense-management

Mọi route là một cửa vào dữ liệu người dùng. Một câu query thiếu điều kiện `userId` là rò rỉ dữ liệu, một `findMany()` trong vòng lặp là sự cố hiệu năng khi dữ liệu lớn lên. Các quy tắc dưới đây là bắt buộc, không phải gợi ý.

## 1. Cấu trúc thư mục API

- Mọi route đặt tại `/src/app/api/<api-group-name>/<api-path>/route.ts`.
- `api-group-name` lấy đúng theo cụm chức năng trong `api-design`, chỉ 8 tên:

  `account` · `report` · `auth` · `category` · `contact` · `currency` · `home` · `transaction`

- Ví dụ:

  ```
  /src/app/api/transaction/list/route.ts
  /src/app/api/account/[id]/route.ts
  /src/app/api/auth/login/route.ts
  /src/app/api/account/create/route.ts
  ```

## 2. Quy ước HTTP method

| Method | Ý nghĩa |
|---|---|
| `GET` | Chỉ đọc, **không** thay đổi dữ liệu, **không** dùng `requestBody`. |
| `POST` | Tạo mới. Trả `201` kèm bản ghi vừa tạo. |
| `PUT` | Cập nhật **toàn bộ** bản ghi. |
| `PATCH` | Cập nhật **một phần**. |
| `DELETE` | **Luôn là soft delete** — set `isDeleted = true`. Không bao giờ xoá vật lý. |

## 3. Query parameter

- Danh sách bắt buộc hỗ trợ ở mọi endpoint dạng danh sách:
  - `page` — mặc định `1`
  - `pageSize` — mặc định `20`, **tối đa `100`**
  - `sortBy`
  - `sortOrder` — `asc` | `desc`
- Bộ lọc theo khoảng: `dateFrom`, `dateTo`.
- Bộ lọc theo quan hệ: `accountId`, `categoryId`, `type`.
- **Toàn bộ query param phải được validate bằng `zod` trước khi dùng.** Sai định dạng → trả `400` với thông báo cụ thể (nói rõ field nào sai, sai thế nào), không trả thông báo chung chung.

```ts
const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'amount', 'date']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  type: z.enum(['income', 'expense']).optional(),
});
```

## 4. Quy tắc query database

- Chỉ truy cập database qua **Prisma Client dùng chung tại `/src/lib/prisma.ts` (singleton)**. Không tự khởi tạo `new PrismaClient()` trong route — mỗi instance mở thêm một pool kết nối.
- **MỌI truy vấn dữ liệu người dùng bắt buộc có điều kiện `userId` của người đang đăng nhập VÀ `isDeleted: false`. Không có ngoại lệ.**
- Luôn dùng `select` hoặc `include` tường minh. **Cấm `findMany()` trả toàn bộ field** — field thừa hôm nay là dữ liệu nhạy cảm lộ ra ngày mai.
- **Cấm truy vấn trong vòng lặp (N+1).** Dùng `include`, `groupBy`, hoặc một truy vấn tổng hợp.
- Tính tổng/thống kê **phải để database làm** bằng `aggregate`/`groupBy`. Không load hết bản ghi về rồi cộng bằng JavaScript.
- Nhiều thao tác ghi liên quan nhau phải bọc trong `prisma.$transaction`.

```ts
// ĐÚNG — lọc theo user, soft delete, select tường minh
const items = await prisma.transaction.findMany({
  where: { userId, isDeleted: false, categoryId },
  select: { id: true, amount: true, date: true, category: { select: { id: true, name: true } } },
  orderBy: { [sortBy]: sortOrder },
  skip: (page - 1) * pageSize,
  take: pageSize,
});

// ĐÚNG — tổng do database tính
const sum = await prisma.transaction.aggregate({
  where: { userId, isDeleted: false },
  _sum: { amount: true },
});

// SAI — N+1 và cộng bằng JS
for (const c of categories) {
  const rows = await prisma.transaction.findMany({ where: { categoryId: c.id } });
  total += rows.reduce((a, r) => a + Number(r.amount), 0);
}
```

## 5. Xử lý lỗi & response

- Bọc handler trong `try/catch`, trả đúng format:

  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} } }
  ```

- **Không để lộ message lỗi gốc của Prisma ra ngoài client** — nó chứa tên bảng, tên cột, cấu trúc schema. Ghi log đầy đủ ở server, trả về client thông báo đã chuẩn hoá.
- **Số tiền trả về dạng chuỗi decimal**, dùng `.toString()` trên Prisma `Decimal` — không `Number()`, không để JSON tự serialize.

```ts
export async function GET(req: Request) {
  try {
    const parsed = listQuerySchema.safeParse(
      Object.fromEntries(new URL(req.url).searchParams)
    );
    if (!parsed.success) {
      return Response.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Query parameter không hợp lệ', details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }
    // ...
    return Response.json({
      data: items.map((i) => ({ ...i, amount: i.amount.toString() })),
      meta: { page, pageSize, total },
    });
  } catch (err) {
    console.error('[transaction/list]', err);
    return Response.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Đã có lỗi xảy ra', details: {} } },
      { status: 500 }
    );
  }
}
```

## 6. Bổ sung test script khi API thay đổi

**Mọi thay đổi API — thêm endpoint, đổi request/response, đổi mã lỗi, đổi validation — đều phải kèm test script trong cùng task.** Task chỉ sửa code mà không đụng tới `test/` là task chưa xong.

Bộ test viết bằng **Grafana k6**, đặt tại `test/<module>/<module>.test.js` theo đúng nhóm API:

```
test/account/account.test.js       test/contact/contact.test.js
test/category/category.test.js     test/currency/currency.test.js
test/auth/auth.test.js             test/transaction/transaction.test.js
                                   test/report/report.test.js
```

- API thuộc module đã có → **thêm case vào đúng file module đó**, không tạo file mới.
- Module mới → tạo `test/<module>/<module>.test.js` theo đúng khuôn của các file sẵn có, rồi đăng ký vào mảng `MODULES` trong `test/all.test.js`.
- Đọc `test/README.md` trước khi sửa — nó nói rõ cơ chế `ctx.ready` / `bootstrap*()` khiến mỗi file vừa chạy lẻ được vừa chạy chung được.

Ràng buộc khi viết case:

| Quy tắc | Lý do |
|---|---|
| Dùng `expect(id, ok, detail)` của `test/lib/expect.js`, **không** gọi thẳng `check()` của k6 | `id` là mã test case (`B15`, `H23`...) khớp bảng test case trong `plans/backend/*.md`, tra ngược được khi fail |
| `detail` luôn kèm **dữ liệu thực tế** (`JSON.stringify(r.body)`, giá trị so sánh) | Fail mà không thấy giá trị thật thì phải chạy lại mới debug được |
| Gọi API qua client trong `ctx` (`A`, `B`, `anon`) | `A`/`B` là hai user khác nhau — dùng để chứng minh dữ liệu tách bạch; `anon` cho case `401` |
| Mỗi endpoint mới phải có đủ: happy path, validation `400`, `401` khi chưa đăng nhập, `404` khi truy cập dữ liệu của user khác | Bốn nhóm này là nơi lỗi bảo mật thực sự xuất hiện |
| Dữ liệu tạo mới gắn hậu tố `ctx.stamp` | Bộ test chạy trên database thật, không gắn stamp là đụng ràng buộc trùng tên ở lần chạy thứ hai |

Thêm test case mới thì **cập nhật luôn bảng test case trong `plans/backend/<ten_task>.md`** để mã case ở hai nơi không lệch nhau.

## 7. Regression test sau khi code xong

Code xong, **gọi sub-agent `api-testing`** (`.claude/agents/api-testing.md`) để chạy regression trên toàn bộ bộ test, không tự chạy rồi tự kết luận.

Giao cho sub-agent đúng ba việc:

1. Chạy module liên quan tới thay đổi vừa làm: `k6 run test/<module>/<module>.test.js`
2. Chạy toàn bộ để bắt hồi quy sang module khác: `k6 run test/all.test.js`
3. Báo cáo lại cho agent chính: số case pass/fail, và với mỗi case fail thì nêu mã case, giá trị mong đợi, giá trị thực tế.

Lưu ý khi giao việc:

- Cần dev server đang chạy (`npm run dev`). Server không ở port mặc định thì truyền `-e API_BASE_URL=http://localhost:<port>/api`.
- `k6 run` trả **exit code 99** khi có case fail (nhờ threshold `checks: rate==1.00`), exit `0` khi sạch. Đây là căn cứ pass/fail, không phải cảm nhận từ log.
- Sub-agent **không được sửa code trong `src/` hoặc `prisma/`**. Nó chỉ báo cáo; sửa lỗi nghiệp vụ là việc của agent chính.

Agent chính nhận báo cáo rồi **thuật lại kết quả cho user** — số case pass/fail và các case fail — trước khi coi task là hoàn thành. Còn case fail thì task chưa xong: sửa code, chạy lại, cho tới khi sạch.
