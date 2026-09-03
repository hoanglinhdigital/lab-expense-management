@AGENTS.md

# CLAUDE.md — Quy tắc làm việc cho Claude Code

Tài liệu này định nghĩa quy tắc bắt buộc khi Claude Code làm việc trong project `lab-expense-management`.

## 1. Cấu trúc project

```
docs/
  api-spec/     # OpenAPI 3.0 spec cho từng API (1 file/nhóm API)
  mockup/       # Mockup do user cung cấp, chia theo thư mục con = tên màn hình/tính năng
plans/
  backend/      # Plan (.md) cho từng feature backend
  frontend/     # Plan (.md) cho từng màn hình frontend
  infra/        # Plan (.md) cho các tác vụ hạ tầng (Terraform, CI/CD, deploy AWS)
prisma/         # Schema, migrations, seed — nằm ở root, không di chuyển
src/            # Toàn bộ source code ứng dụng (App Router)
```

## 2. Các lệnh npm thường dùng

| Lệnh | Mục đích |
|---|---|
| `npm run dev` | Chạy dev server (Next.js) |
| `npm run build` | Build production |
| `npm run lint` | Chạy ESLint |
| `npx prisma migrate dev` | Tạo & áp dụng migration mới trong môi trường dev |
| `npx prisma studio` | Mở Prisma Studio để xem/sửa dữ liệu qua UI |

## 3. Version cố định của stack

Lấy đúng theo `package.json` hiện tại của project — không tự ý nâng/hạ version khi không được yêu cầu:

- **Next.js**: `16.3.0` (App Router)
- **React**: `19.2.8`, bật **React Compiler**
- **TypeScript**: `^5`, **strict mode** bắt buộc (`strict: true` trong `tsconfig.json`)
- **Tailwind CSS**: `^4`
- **Prisma**: `^7.9.1` (`@prisma/client` + `@prisma/adapter-mariadb`)


## 4. Kiến trúc App Router

- Toàn bộ source code nằm trong `/src`, không dùng Pages Router (`pages/`).
- Root layout tại `src/app/layout.tsx`.
- Alias import `@/*` trỏ vào `src/*`.
- TypeScript strict mode bắt buộc: **không dùng `any`** nếu không giải thích rõ lý do bằng comment ngay tại chỗ dùng.

## 5. Nơi lưu tài liệu

- Mockup màn hình (input từ user): `/docs/mockup/<tên-màn-hình>/`
- API spec OpenAPI 3.0: `/docs/api-spec/`
- Plan backend: `/plans/backend/<ten_task>.md`
- Plan frontend: `/plans/frontend/<ten_task>.md`
- Plan infra: `/plans/infra/<ten_task>.md`

## 6. Nguyên tắc thiết kế database (Prisma)
- DB Engine: MySQL 8.x
- Mọi thay đổi schema phải đi qua migration (`prisma migrate dev`) — **không sửa tay trực tiếp trên database**.
- Tên model: **PascalCase, số ít** (vd: `Expense`, `Category`, không phải `expenses`).
- Tên field: **camelCase** (vd: `createdAt`, `categoryId`).
- Mọi model đều phải có `createdAt` và `updatedAt`.
- **Không xoá migration đã áp dụng** trong thư mục `prisma/migrations`.

## 7. Quy trình bắt buộc: Explore → Plan → Code → Verify

### Rule chung

1. **Explore**: đọc code, hiểu cấu trúc liên quan. Không sửa file ở bước này.
2. **Plan**: đề xuất kế hoạch chi tiết, ghi ra file `.md` tương ứng (xem mục 5). User đọc và duyệt trước khi sang Code. Mỗi file plan phải:
   - Liệt kê các hạng mục theo dạng gạch đầu dòng, phân nhóm rõ: **Thêm file**, **Sửa file**, **Xóa file**.
   - Có checklist dạng `- [ ] tên task` cho từng đầu việc cần thực hiện.
3. **Code**: chỉ thực thi đúng theo kế hoạch đã được duyệt. Không tự ý mở rộng phạm vi ngoài plan.
4. **Verify**: build (`npm run build`), chạy lint/test liên quan (`npm run lint`), xem lại `git diff` để xác nhận thay đổi đúng như mong đợi.
5. Sau khi hoàn thành từng task trong plan, phải tick lại thành `- [x] tên task` trong đúng file plan đó.

### Rule riêng theo loại task

- **Frontend / Screen**:
  - Đọc mockup trong `docs/mockup/` trước khi Plan. Nếu user chỉ định mockup cụ thể cho màn hình, **chỉ đọc đúng mockup cần thiết**, không đọc lan sang mockup khác.
  - List up all components, props, state, data flow, edge cases.
  - List logic xử lý, query params, validation, error handling, và các test case.
  - Ghi plan vào `plans/frontend/<ten_task>.md`.

- **Backend / API / Database**:
  - Nếu chưa có API spec cho tính năng liên quan, phải **đề xuất OpenAPI 3.0 spec trước**, ghi vào `docs/api-spec/`, chờ user duyệt rồi mới sang bước Plan.
  - List up all components, props, state, data flow, edge cases.
  - List logic xử lý, query params, validation, error handling, và các test case.
  - Ghi plan vào `plans/backend/<ten_task>.md`.
  - Thay đổi schema Prisma → tạo migration ngay trong cùng task

- **Infra**:
  - Ghi plan vào `plans/infra/<ten_task>.md`.
  - **Không tự ý apply lên môi trường thật** (Terraform apply, deploy AWS, v.v.) khi chưa được xác nhận rõ ràng ở bước Plan.
