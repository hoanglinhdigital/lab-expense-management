# Plan Backend 03 — Category

Nguồn: `docs/api-spec/category.yaml`. Phụ thuộc: `plans/backend/00_foundation.md`.

## 1. Endpoint

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/categories` | SYSTEM + USER hợp nhất, phẳng hoặc cây |
| POST | `/api/categories` | Tạo category `scope = USER` |
| GET | `/api/categories/{categoryId}` | Chi tiết |
| PATCH | `/api/categories/{categoryId}` | Cập nhật (chỉ USER của chính mình) |
| DELETE | `/api/categories/{categoryId}` | Xoá mềm (chỉ USER của chính mình) |

## 2. Quy tắc quyền — cốt lõi của cụm này

```
Đọc:  scope = SYSTEM (userId = null)  → mọi user đều thấy
      scope = USER                    → chỉ khi userId = user hiện tại
Ghi:  scope = SYSTEM                  → 403 SYSTEM_CATEGORY_READONLY  (luôn luôn)
      scope = USER, userId khác       → 404 CATEGORY_NOT_FOUND
      scope = USER, userId là mình    → cho phép
```

Điều kiện `where` khi đọc: `{ isDeleted: false, OR: [{ scope: SYSTEM }, { userId }] }`.

Thứ tự kiểm tra khi ghi: **tìm bản ghi trước** (kể cả của user khác) → nếu không có `404` → nếu `scope = SYSTEM` trả `403` → nếu `userId` khác trả `404` → mới xử lý.

## 3. Query params

- `page` (≥1, mặc định 1), `pageSize` (1–200, mặc định 50).
- `type`: `INCOME` | `EXPENSE`, bỏ trống = cả hai.
- `scope`: `SYSTEM` | `USER`, bỏ trống = cả hai.
- `parentId`: chuỗi rỗng → `parentId: null` (chỉ danh mục gốc); có giá trị → lọc đúng cha đó.
- `tree` (mặc định `false`): `true` thì `data` chỉ chứa danh mục gốc kèm `children`, và `meta.total` đếm **số danh mục gốc**.
- `keyword`: `contains` trên `name`.

Khi `tree=true`: phân trang trên tập danh mục gốc trước, rồi mới nạp `children` của đúng các gốc trong trang (một query `in`) — không nạp toàn bộ cây rồi mới cắt.

`usageCount`: `groupBy` trên `Transaction` (`isDeleted: false`, `userId`) theo `categoryId`, một query cho cả trang. Với `tree=true` thì `usageCount` của cha **không** cộng dồn con (spec định nghĩa là số giao dịch dùng chính danh mục đó); phần cộng dồn thuộc về báo cáo ở plan 07.

## 4. Nghiệp vụ & edge case

| Tình huống | Kết quả |
|---|---|
| POST luôn ép `scope = USER`, `userId = session` | Không có API tạo SYSTEM |
| `parentId` không tồn tại / không đọc được | `404 PARENT_CATEGORY_NOT_FOUND` |
| `parentId` khác `type` với con | `400`, `details.parentId` |
| `parentId` trỏ tới category đã có `parentId` | `400` — chỉ cho lồng một cấp |
| `parentId` là category SYSTEM | **Cho phép** (spec nêu rõ), miễn cùng `type` và là gốc |
| PATCH `parentId` trỏ vào chính nó | `400`, `details.parentId` |
| PATCH `parentId` trỏ vào con của chính nó | `400` — chống chu trình |
| PATCH đặt `parentId` cho category **đang có con** | `400` — sẽ thành 2 cấp |
| PATCH đổi `type` khi đã có transaction | `409 CATEGORY_TYPE_LOCKED` |
| PATCH đổi `type` khi đang có con hoặc có cha | `400` — cha/con phải cùng `type` |
| Trùng tên (cùng `userId` + `name` + `type`, chưa xoá) | `409 CATEGORY_NAME_DUPLICATED` |
| DELETE khi còn transaction chưa xoá | `409 CATEGORY_IN_USE`, `details.transactionCount` |
| DELETE khi còn con chưa xoá | `409 CATEGORY_IN_USE`, `details.childCount` |
| DELETE category SYSTEM | `403 SYSTEM_CATEGORY_READONLY` |
| `color` không khớp `^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$` | `400`, `details.color` |

`409 CATEGORY_IN_USE` luôn trả **cả hai** `transactionCount` và `childCount` như ví dụ trong spec.

## 5. Hạng mục

### Thêm file

- `src/app/api/categories/route.ts` — `GET`, `POST`
- `src/app/api/categories/[categoryId]/route.ts` — `GET`, `PATCH`, `DELETE`
- `src/lib/services/category.service.ts` — kèm `assertCategoryReadable(userId, categoryId)` để plan 05 và 07 dùng lại
- `src/lib/api/schemas/category.schema.ts`
- `src/lib/api/serializers/category.serializer.ts`

### Sửa file

- Không sửa file có sẵn.

### Xóa file

- Không xoá file nào.

## 6. Test case

| # | Tình huống | Kỳ vọng |
|---|---|---|
| C1 | GET `/categories` bằng user mới tinh | Trả đủ 11 category SYSTEM từ seed |
| C2 | User A tạo category, user B gọi GET | User B không thấy category của A |
| C3 | GET `?scope=SYSTEM` | Chỉ SYSTEM, mọi item `scope = "SYSTEM"` |
| C4 | GET `?type=INCOME` | Chỉ INCOME |
| C5 | GET `?parentId=` (rỗng) | Chỉ danh mục gốc |
| C6 | GET `?tree=true` | Item gốc có `children`, `meta.total` = số gốc |
| C7 | GET có `usageCount` | Khớp số transaction chưa xoá dùng danh mục đó |
| C8 | POST hợp lệ | `201`, `scope = "USER"` |
| C9 | POST với `parentId` là category SYSTEM cùng type | `201` |
| C10 | POST với `parentId` khác `type` | `400`, `details.parentId` |
| C11 | POST với `parentId` là category cấp 2 | `400` |
| C12 | POST với `parentId` không tồn tại | `404 PARENT_CATEGORY_NOT_FOUND` |
| C13 | POST trùng `name` + `type` | `409 CATEGORY_NAME_DUPLICATED` |
| C14 | POST trùng `name` khác `type` | `201` — hợp lệ |
| C15 | PATCH category SYSTEM | `403 SYSTEM_CATEGORY_READONLY` |
| C16 | PATCH category của user khác | `404 CATEGORY_NOT_FOUND` |
| C17 | PATCH `parentId` = chính nó | `400` |
| C18 | PATCH `parentId` = con của nó | `400` |
| C19 | PATCH đổi `type` khi đã có transaction | `409 CATEGORY_TYPE_LOCKED` |
| C20 | DELETE category SYSTEM | `403 SYSTEM_CATEGORY_READONLY` |
| C21 | DELETE category còn transaction | `409 CATEGORY_IN_USE`, `transactionCount > 0` |
| C22 | DELETE category còn con | `409 CATEGORY_IN_USE`, `childCount > 0` |
| C23 | DELETE category sạch | `204`, biến mất khỏi list |
| C24 | `color = "red"` | `400`, `details.color` |

## 7. Checklist

- [x] Viết `src/lib/api/schemas/category.schema.ts`
- [x] Viết `src/lib/api/serializers/category.serializer.ts`
- [x] Viết `src/lib/services/category.service.ts` (gồm quy tắc SYSTEM read-only)
- [x] Viết route `GET|POST /api/categories`
- [x] Viết route `GET|PATCH|DELETE /api/categories/[categoryId]`
- [x] Chạy `npm run lint` + `npm run build`
- [x] Chạy test script kiểm chứng C1–C24
