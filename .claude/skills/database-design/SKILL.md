---
name: database-design
description: Áp dụng khi tạo mới hoặc sửa Prisma model, schema.prisma, quan hệ giữa các bảng, hoặc index trong project này.
---

# Database design rules — lab-expense-management

Schema là thứ khó sửa nhất sau khi lên production. Một bảng thiếu index hôm nay là một câu query 8 giây khi có một triệu người dùng; một cột `Float` cho số tiền là sai số kế toán không bao giờ đối soát được. Các quy tắc dưới đây là **bắt buộc**, không phải gợi ý.

## 1. Field bắt buộc cho MỌI entity

Mọi model không có ngoại lệ:

```prisma
id        String   @id @default(cuid())
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
isDeleted Boolean  @default(false)
```

## 2. Soft delete

- **KHÔNG BAO GIỜ hard delete.** Mọi thao tác xoá là `update({ data: { isDeleted: true } })`.
- **Mọi truy vấn đọc mặc định phải lọc `isDeleted: false`.** Không có ngoại lệ — thiếu điều kiện này là bug dữ liệu, không phải tối ưu.

```ts
// ĐÚNG
await prisma.expense.update({ where: { id }, data: { isDeleted: true } });
await prisma.expense.findMany({ where: { userId, isDeleted: false } });

// SAI
await prisma.expense.delete({ where: { id } });
```

## 3. Kiểu dữ liệu

- **Mọi giá trị tiền tệ** (`amount`, `balance`, `budget`, ...) dùng `Decimal @db.Decimal(18, 2)`. **TUYỆT ĐỐI không dùng `Float` hay `Double`** — nhị phân dấu phẩy động không biểu diễn được tiền.
- **Không dùng free string cho giá trị có tập giá trị hữu hạn.** Phải khai báo `enum` ngay trong `schema.prisma` (ví dụ `TransactionType`, `AccountType`, `CategoryScope`).

```prisma
enum TransactionType {
  INCOME
  EXPENSE
  TRANSFER
}

model Transaction {
  amount Decimal         @db.Decimal(18, 2)
  type   TransactionType
}
```

## 4. Quan hệ

- Mọi foreign key phải khai báo `@relation` **TƯỜNG MINH**, ghi rõ `fields`, `references` và `onDelete`.
- **Không dựa vào quan hệ ngầm định (implicit relation) của Prisma.**

```prisma
// ĐÚNG
category   Category @relation(fields: [categoryId], references: [id], onDelete: Restrict)
categoryId String

// SAI — implicit, không kiểm soát được hành vi khi xoá
category Category
```

## 5. Naming convention

| Đối tượng | Quy tắc | Ví dụ |
|---|---|---|
| Model (Prisma) | PascalCase, số ít | `User`, `Transaction` |
| Bảng vật lý | lowercase, số ít, qua `@@map` | `user`, `expense`, `category`, `transaction`, `account` |
| Field | camelCase | `createdAt`, `userId`, `isDeleted` |
| Foreign key | `{model}Id` | `userId`, `categoryId`, `accountId` |
| Index | `idx_{table}_{field}` qua thuộc tính `map` của `@@index` | `idx_transaction_user_id_date` |

## 6. Index — ưu tiên TỐC ĐỘ TRUY VẤN

Đây là ứng dụng dự kiến phục vụ **HÀNG TRIỆU người dùng**. Với mỗi model được tạo hoặc sửa, phải tự hỏi: *truy vấn nào sẽ chạy trên bảng này, và nó có chậm dần khi số user tăng không?*

Bắt buộc đánh index cho:

- **Mọi foreign key.**
- **Mọi field dùng để lọc.**
- **Mọi field dùng để sắp xếp.**

Ngoài ra:

- Truy vấn lọc nhiều điều kiện → tạo **composite index theo đúng thứ tự lọc** (ví dụ `@@index([userId, date])` cho danh sách giao dịch theo người dùng sắp xếp theo ngày).
- Ràng buộc nghiệp vụ duy nhất → thêm `@@unique` (ví dụ `email` của user).
- **Khi thêm/sửa model, in ra danh sách các truy vấn dự kiến kèm index tương ứng để user đối chiếu.**

```prisma
model Transaction {
  id         String          @id @default(cuid())
  userId     String
  accountId  String
  categoryId String
  type       TransactionType
  amount     Decimal         @db.Decimal(18, 2)
  date       DateTime
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt
  isDeleted  Boolean         @default(false)

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  account  Account  @relation(fields: [accountId], references: [id], onDelete: Restrict)
  category Category @relation(fields: [categoryId], references: [id], onDelete: Restrict)

  @@index([userId, date], map: "idx_transaction_user_id_date")
  @@index([userId, categoryId], map: "idx_transaction_user_id_category_id")
  @@index([accountId], map: "idx_transaction_account_id")
  @@index([userId, isDeleted], map: "idx_transaction_user_id_is_deleted")
  @@map("transaction")
}
```

Bảng đối chiếu phải in ra cho user, dạng:

| Truy vấn dự kiến | Index phục vụ |
|---|---|
| Danh sách giao dịch của user, sắp xếp theo ngày | `idx_transaction_user_id_date` |
| Lọc giao dịch của user theo danh mục | `idx_transaction_user_id_category_id` |
| Tổng số dư theo tài khoản | `idx_transaction_account_id` |

## 7. Sau mỗi thay đổi schema

- **Luôn nhắc lại rằng cần chạy migration** — schema đã sửa nhưng chưa migrate là database lệch với code.
- Gọi **sub-agent `database-migrate`** để thực hiện migration. Không tự chạy lệnh migrate ngoài luồng này, và không sửa tay trực tiếp trên database.
