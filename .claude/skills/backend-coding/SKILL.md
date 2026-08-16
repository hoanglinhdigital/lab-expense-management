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
