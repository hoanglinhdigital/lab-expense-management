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

1. **Explore**: đọc code, hiểu cấu trúc liên quan. Không sửa file ở bước này. **Bắt buộc dùng graphify (mục 8) để đánh giá ảnh hưởng** trước khi sửa/xóa function, class, type, schema.
2. **Plan**: đề xuất kế hoạch chi tiết, ghi ra file `.md` tương ứng (xem mục 5). User đọc và duyệt trước khi sang Code. Mỗi file plan phải:
   - Liệt kê các hạng mục theo dạng gạch đầu dòng, phân nhóm rõ: **Thêm file**, **Sửa file**, **Xóa file**.
   - Có checklist dạng `- [ ] tên task` cho từng đầu việc cần thực hiện.
   - Có mục **"Đánh giá ảnh hưởng (graphify)"** (xem 8.3) khi có sửa/xóa symbol, gồm quyết định sửa UI/class liên quan và bổ sung test case.
3. **Code**: chỉ thực thi đúng theo kế hoạch đã được duyệt. Không tự ý mở rộng phạm vi ngoài plan.
4. **Verify**: build (`npm run build`), chạy lint/test liên quan (`npm run lint`), xem lại `git diff` để xác nhận thay đổi đúng như mong đợi, đối chiếu với danh sách ảnh hưởng của graphify (8.4) và chạy `graphify update .`.
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

## 8. graphify — Code graph & đánh giá ảnh hưởng (Impact Analysis)

Project có knowledge graph (code-graph) tại `graphify-out/graph.json`, được expose qua MCP server `graphify` (cấu hình trong `.mcp.json`). Graph cho biết quan hệ giữa các file, class, function/method (gọi, import, kế thừa…), god nodes và community. Đây là nguồn chính để đánh giá **phạm vi ảnh hưởng** của một thay đổi.

### 8.1. Công cụ MCP graphify

| Tool | Dùng để |
|---|---|
| `mcp__graphify__query_graph` | Hỏi tự nhiên/tìm node liên quan đến một khái niệm, function, class |
| `mcp__graphify__get_node` | Xem chi tiết một node (file, vị trí, loại) |
| `mcp__graphify__get_neighbors` | Liệt kê node gọi tới / được gọi bởi node đó → **tìm caller/callee (impact)** |
| `mcp__graphify__shortest_path` | Tìm đường quan hệ giữa 2 node (vd: API route ↔ UI component) |
| `mcp__graphify__get_community` | Xem nhóm node cùng module để phát hiện thành phần liên đới |
| `mcp__graphify__god_nodes` | Xác định node trung tâm, thay đổi ảnh hưởng rộng (rủi ro cao) |
| `mcp__graphify__graph_stats` | Kiểm tra graph còn mới/đủ dữ liệu không |
| `mcp__graphify__get_pr_impact` | Đánh giá ảnh hưởng của PR/diff hiện tại (dùng ở bước Verify) |

Nếu MCP không khả dụng, dùng CLI tương đương: `graphify query "<câu hỏi>"`, `graphify path "<A>" "<B>"`, `graphify explain "<khái niệm>"`.

### 8.2. Quy tắc bắt buộc

1. **Luôn chạy impact analysis bằng graphify TRƯỚC khi implement** bất kỳ thay đổi nào có **sửa** hoặc **xóa** function/method/class/type/schema (kể cả đổi signature, đổi kiểu trả về, đổi tên, đổi hành vi). Thực hiện ngay ở bước **Explore**, trước khi viết Plan.
2. Với mỗi symbol bị sửa/xóa, tối thiểu phải:
   - `query_graph`/`get_node` để định vị đúng node;
   - `get_neighbors` để liệt kê **toàn bộ caller/dependent** (route, service, schema, client lib, component UI, test);
   - kiểm tra `god_nodes`/`get_community` nếu symbol nằm ở node trung tâm hoặc dùng chung nhiều module.
3. **Không** dựa vào đoán hay chỉ `grep`. Chỉ đọc raw source sau khi graphify đã định hướng, hoặc để xác minh/sửa đúng dòng cụ thể. Graph là gợi ý: nếu kết quả có vẻ thiếu (vd: dynamic import, string reference), bổ sung bằng `grep` rồi ghi chú lại.
4. Nếu graph cũ (symbol mới/đã đổi không có trong graph) → chạy `graphify update .` rồi truy vấn lại.
5. Với thêm mới thuần túy (không đụng symbol hiện có) vẫn nên dùng `query_graph` để tìm code tái sử dụng/vị trí đặt phù hợp, nhưng không bắt buộc impact analysis.

### 8.3. Kết quả impact analysis phải đi vào Plan

Mỗi file plan (`plans/backend|frontend/*.md`) có thay đổi sửa/xóa symbol phải có mục **"Đánh giá ảnh hưởng (graphify)"** gồm:

- Symbol bị sửa/xóa và loại thay đổi.
- Danh sách caller/dependent tìm được (file + symbol).
- **Quyết định** dựa trên kết quả, mỗi ý là một task `- [ ]` trong plan:
  - Có cần **sửa UI/component** liên quan không (props, state, hiển thị, xử lý lỗi).
  - Có cần **sửa class/service/schema/API spec/client lib** khác không (đồng bộ signature, type, `docs/api-spec/`).
  - Có cần **bổ sung/cập nhật test case** không (unit/integration/k6/Playwright) cho từng caller bị ảnh hưởng và cho regression của hành vi cũ.
- Nếu không có ảnh hưởng ngoài symbol đang sửa, ghi rõ "Không có caller khác" kèm truy vấn đã dùng.

Plan thiếu mục này (khi có sửa/xóa symbol) coi như chưa đủ điều kiện để user duyệt.

### 8.4. Trong các bước của quy trình

- **Explore**: chạy impact analysis (8.2) trước khi kết luận phạm vi.
- **Plan**: ghi kết quả theo 8.3.
- **Code**: chỉ sửa trong phạm vi plan; nếu phát hiện thêm caller bị ảnh hưởng ngoài plan → dừng, cập nhật plan và báo user trước khi sửa tiếp.
- **Verify**: dùng `get_pr_impact` (hoặc truy vấn lại `get_neighbors`) đối chiếu diff thực tế với danh sách ảnh hưởng đã lập; sau đó chạy `graphify update .` để graph phản ánh code mới.

### 8.5. Quy tắc điều hướng chung

- Với câu hỏi về codebase, ưu tiên graphify (`query_graph` hoặc `graphify query "<question>"`) trước khi đọc file/grep.
- Nếu có `graphify-out/wiki/index.md`, dùng nó để điều hướng tổng quan thay vì duyệt raw source.
- Chỉ đọc `graphify-out/GRAPH_REPORT.md` khi cần review kiến trúc tổng thể hoặc khi query/path/explain không đủ ngữ cảnh.
- Sau khi sửa code, chạy `graphify update .` (AST-only, không tốn API cost) để cập nhật graph.
- Subagent làm việc liên quan đến code cũng phải tuân thủ các quy tắc này — đưa yêu cầu dùng graphify vào prompt khi giao việc.


## 9. Truy vấn database MySQL — bắt buộc dùng MCP `mysql-expense`

Mọi tác vụ **query/đọc dữ liệu** từ database MySQL `expense_db` (SELECT, SHOW, DESCRIBE, kiểm tra schema, đếm dòng…) **BẮT BUỘC** dùng MCP Server `mysql-expense`:

| Tool | Dùng để |
|---|---|
| `mcp__mysql-expense__execute_sql` | Chạy câu SQL (SELECT, SHOW, DESCRIBE, COUNT…) |
| `mcp__mysql-expense__get_schema_info` | Xem cấu trúc bảng/cột |
| `mcp__mysql-expense__get_table_sample` | Xem mẫu dữ liệu của một bảng |

**Nghiêm cấm:**
- Dùng `docker exec` hoặc bất kỳ cách nào khác để truyền lệnh vào container `expense-mysql`.
- Tự đăng nhập MySQL bằng user `root` hoặc `expense_user` (qua CLI, script, hay client khác).

**Khi MCP `mysql-expense` không kết nối được:** dừng lại và báo lỗi cho user. **KHÔNG** tự chuyển sang `docker exec` hay cách khác để lách.
