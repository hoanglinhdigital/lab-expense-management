# Tư vấn phương án triển khai — lab-expense-management

## Context

App hiện tại: **Next.js 16.3.0 (App Router)** + **React 19 (React Compiler)** + **Prisma 7.9** với
`@prisma/adapter-mariadb` trỏ tới **MySQL/MariaDB** local. Auth tự viết bằng session cookie httpOnly
(bảng `Session`), tiền tệ dùng `Decimal(18,2)`, soft-delete toàn bộ. Test bằng Grafana k6.
Chưa có Docker / Terraform / CI deploy — thư mục `plans/infra/` mới chỉ có `.gitkeep`.

Yêu cầu user (đã chốt qua hỏi đáp):

- Ưu tiên: **chi phí thấp/miễn phí** + **ít vận hành nhất** (fully-managed, deploy bằng git push).
- Database: **giữ MySQL — KHÔNG đổi DB engine**, tìm nhà cung cấp MySQL miễn phí.
- Quy mô: **nội bộ lab < 50 user** — không cần scale lớn, không cần region tối ưu.

Kết quả mong muốn: tài liệu infra để user duyệt, kèm các bước code cần làm để đưa app lên mạng.

> Thông tin nhà cung cấp bên dưới tra cứu trên internet tháng 8/2026 — xem mục **Nguồn** ở cuối.

---

## 1. So sánh nền tảng deploy (cho Next.js 16 App Router + Prisma)

| Nền tảng | Free tier | Vận hành | Hợp với app này | Nhược điểm chính |
|---|---|---|---|---|
| **Vercel** (khuyến nghị) | Hobby: miễn phí, 100 GB băng thông, Serverless + Cron, custom domain | Rất thấp — `git push` là xong | Next.js là sản phẩm của Vercel: SSR, Route Handlers, React Compiler, `next/image` chạy không cần chỉnh | Hobby **chỉ dùng phi thương mại**; serverless → mỗi lambda mở connection MySQL riêng, phải giới hạn pool; cold start nhẹ |
| **Railway** (khuyến nghị #2) | Trial $5 credit, sau đó Hobby $5/tháng (kèm $5 usage) | Thấp — app + MySQL trong **cùng 1 project**, không cần lo pooling | Chạy container Node thường (`next start`), không giới hạn runtime, có sẵn plugin MySQL | Không "miễn phí" bền vững; ~5 USD/tháng |
| **Render** | Web service free (ngủ sau 15 phút, wake ~30–60s) | Thấp | Chạy `next start` như server thường, kết nối MySQL ngoài | Cold start chậm khó chịu cho demo; không có MySQL managed miễn phí (chỉ Postgres) |
| **Netlify** | Tương tự Vercel | Thấp | Chạy qua Netlify adapter cho Next | Hỗ trợ Next mới thường trễ hơn Vercel; rủi ro với Next 16 |
| **Cloudflare Workers/Pages** | Hào phóng | Trung bình | Cần `@opennextjs/cloudflare`, runtime workerd | Prisma cần adapter đặc thù; kết nối MySQL TCP từ Workers vướng — không khuyến nghị |
| **Fly.io** | Free allowance nhỏ | Trung bình — cần Dockerfile, `fly.toml` | Container full Node, region Singapore gần VN | Phải tự viết Dockerfile + quản máy ảo |
| **AWS (Amplify / ECS + RDS)** | 12 tháng free tier, sau đó tính tiền | Cao — IAM, VPC, RDS, Terraform | Đúng hướng CLAUDE.md nhắc tới | Quá nặng cho lab < 50 user; RDS + NAT gateway phát sinh chi phí thật |
| **Self-host VPS + Coolify** | ~4–6 USD/tháng VPS | Cao — tự lo OS, TLS, backup | Toàn quyền | Trái với yêu cầu "ít vận hành nhất" |

**Chốt: Vercel Hobby** cho app (miễn phí thật, deploy bằng git push, có Cron sẵn).
Nếu muốn né hoàn toàn vấn đề connection pooling của serverless và chấp nhận ~5 USD/tháng thì **Railway all-in-one** (app + MySQL cùng chỗ) là lựa chọn đơn giản nhất về vận hành.

---

## 2. So sánh nhà cung cấp MySQL miễn phí (giữ nguyên engine)

| Provider | Free tier | Loại MySQL | Idle / giới hạn | Hợp với Prisma |
|---|---|---|---|---|
| **TiDB Cloud Starter** (khuyến nghị) | 5 GiB row storage + 50M Request Units / tháng, tối đa 5 instance / org, không cần thẻ | **MySQL-compatible** (giao thức MySQL 8, không phải MySQL thật) | Không pause vĩnh viễn; hết quota tháng → chặn kết nối mới tới đầu tháng sau; có region AWS Singapore | Dùng datasource `provider = "mysql"`, driver adapter MariaDB giữ nguyên. **Lưu ý**: hỗ trợ FK có giới hạn — cân nhắc `relationMode = "prisma"` và test kỹ migration |
| **Aiven for MySQL** | 1 CPU / 1 GB RAM / **1 GB disk**, tối đa 76 connection, 1 instance free / org, không cần thẻ | **MySQL thật** (drop-in, không rủi ro tương thích) | **Tự power down khi không có hoạt động liên tục** (có cảnh báo trước, bật lại được); không VPC/static IP; không SLA | Không đổi gì — `@prisma/adapter-mariadb` + migrations hiện tại chạy nguyên |
| **Railway MySQL plugin** | Nằm trong credit $5/tháng của Railway | MySQL thật | Không pause nếu còn credit | Không đổi gì; đặt chung project với app nên **không cần pooling** |
| **Clever Cloud MySQL** | Gói dev free ~256 MB | MySQL thật | Rất nhỏ, chỉ hợp thử nghiệm | Không đổi gì |
| **PlanetScale** | **Đã bỏ free tier từ 4/2024** | Vitess/MySQL | — | Rẻ nhất hiện ~5 USD/tháng (PS-5) |
| **db4free.net** | Free nhưng chỉ để test, không SLA, hay downtime | MySQL thật | Không dùng cho môi trường "chạy thật" dù là lab | — |

**Chốt DB:**

- **Ưu tiên 1 — TiDB Cloud Starter**: dung lượng free lớn nhất (5 GiB), không pause, có region Singapore. Đánh đổi: là MySQL-*compatible* nên cần chạy lại toàn bộ migration + k6 trên đó để chắc chắn, và có thể phải bật `relationMode = "prisma"`.
- **Ưu tiên 2 — Aiven for MySQL**: là MySQL thật, zero rủi ro tương thích, không đổi một dòng code nào. Đánh đổi: chỉ 1 GB dung lượng, 76 connection, và **tự tắt khi idle** (phiền cho lab demo thưa nhưng bật lại nhanh).
- **Ưu tiên 3 — Railway all-in-one**: nếu chấp nhận ~5 USD/tháng, đặt app + MySQL cùng project, bỏ luôn bài toán pooling.

---

## 3. Mô hình kiến trúc khuyến nghị

### Phương án A — Vercel + TiDB Cloud Starter (miễn phí)

```
┌────────────────────┐
│  Trình duyệt (PWA)  │  mobile-first, cookie `session` httpOnly
└─────────┬──────────┘
          │ HTTPS
┌─────────▼───────────────────────────────────────────┐
│  Vercel Edge Network (CDN + TLS + custom domain)     │
└─────────┬───────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────┐
│  Next.js 16 trên Vercel — Node.js runtime            │
│   - Server Components / SSR các màn hình             │
│   - Route Handlers  src/app/api/**  (REST hiện có)   │
│   - Middleware: check cookie session                 │
│   - Vercel Cron: dọn Session hết hạn, refresh tỷ giá │
└─────────┬───────────────────────────────────────────┘
          │ Prisma Client + @prisma/adapter-mariadb
          │ DATABASE_URL có ?connection_limit=1 & ssl (giảm số kết nối/lambda)
┌─────────▼───────────────────────────────────────────┐
│  TiDB Cloud Starter (MySQL 8 protocol)               │
│   - region: AWS ap-southeast-1 (Singapore)           │
│   - serverless proxy tự xử lý gộp kết nối phía server│
└─────────────────────────────────────────────────────┘

Secrets: Vercel Environment Variables (Production / Preview / Development)
CI/CD:   GitHub → Vercel Git Integration (auto Preview mỗi PR, Production khi merge master)
         + GitHub Actions chạy `prisma migrate deploy` trước khi Vercel build
```

### Phương án B — Railway all-in-one (~5 USD/tháng, vận hành đơn giản nhất)

```
Trình duyệt → Railway edge → Next.js (`next start`, container Node, long-running)
                                   │ @prisma/adapter-mariadb, pool bình thường
                                   ▼
                             Railway MySQL plugin (cùng project, mạng nội bộ)
Cron: Railway Cron service gọi Route Handler /api/cron/*
```

Nguyên tắc chung:

- **Route Handler chạy Node runtime** (không Edge) vì Prisma + `bcryptjs` + `crypto` cần Node.
- **Giữ nguyên** `datasource provider = "mysql"`, `@prisma/adapter-mariadb`, và toàn bộ `prisma/migrations` hiện có — không reset DB.
- Với phương án serverless (A): thêm `connection_limit=1` (và `pool_timeout`) vào `DATABASE_URL` để mỗi lambda không giữ nhiều kết nối; bật SSL theo yêu cầu của TiDB.
- Không thêm dịch vụ auth ngoài — session cookie hiện tại đã đủ, không tốn tiền.
- Job định kỳ: Vercel Cron (`vercel.json`) hoặc Railway Cron gọi Route Handler bảo vệ bằng secret header.

---

## 4. Việc cần làm ở bước Code

> **Đã chốt phương án A (Vercel + TiDB Cloud Starter). Trạng thái implement bên dưới.**

### Thêm file

- [x] `prisma.config.ts` — đã tồn tại sẵn (Prisma tự sinh), có `datasource.url` từ env → không cần thêm.
- [x] `vercel.json` — cron `/api/cron/cleanup-sessions` chạy hằng ngày (`0 18 * * *`) + `regions: ["sin1"]`.
- [x] `.env.example` — `DATABASE_URL` (kèm `?ssl=true`), `DATABASE_CONNECTION_LIMIT`, `DATABASE_SSL`, `CRON_SECRET`, `API_BASE_URL`. Thêm ngoại lệ `!.env.example` trong `.gitignore`.
- [x] `src/app/api/cron/cleanup-sessions/route.ts` — xoá `Session` có `expiresAt < now`; chặn nếu thiếu/sai `Authorization: Bearer $CRON_SECRET`; ép `runtime = "nodejs"` + `dynamic = "force-dynamic"`.
- [x] `src/lib/db-connection.ts` — hàm `resolveDatabaseUrl()` dùng chung: tự thêm `?ssl=true` (bỏ qua khi host là localhost hoặc `DATABASE_SSL=false`) và `connectionLimit` (mặc định 3, chỉnh qua `DATABASE_CONNECTION_LIMIT`).
- [x] `.github/workflows/deploy.yml` — push `master` chạm `prisma/**` → `npm ci` → `npx prisma migrate deploy` với secret `DATABASE_URL`; có `workflow_dispatch` + `concurrency` chống chạy chồng.

### Sửa file

- [x] `prisma/schema.prisma` — **không đổi**: `datasource` không cần `url` vì runtime dùng adapter, CLI lấy từ `prisma.config.ts`. Giữ `provider = "mysql"`, **không** bật `relationMode` (TiDB 7.x hỗ trợ FK — verify ở bước migrate, chỉ bật nếu migrate báo lỗi FK).
- [x] `src/lib/prisma.ts` — thay `process.env.DATABASE_URL!` bằng `resolveDatabaseUrl()`.
- [x] `prisma/seed.ts` — dùng chung `resolveDatabaseUrl()`.
- [x] `package.json` — thêm scripts `postinstall: prisma generate`, `db:deploy: prisma migrate deploy`. Không đổi dependency.
- [x] `next.config.ts` — `serverExternalPackages: ["@prisma/adapter-mariadb", "mariadb"]`.
- [x] `test/**` (k6) — **không cần đổi**: `test/lib/http.js` đã đọc `__ENV.API_BASE_URL`, chỉ cần truyền biến khi chạy.

### Verify đã chạy

- [x] `npm run lint` — pass.
- [x] `npx prisma generate` + `npm run build` — pass; route `/api/cron/cleanup-sessions` build thành function động.
- [x] `prisma migrate deploy` trên TiDB Cloud Starter (`expense_db`, region `ap-northeast-1`) — cả 3 migration applied sạch, `prisma migrate status` báo up to date.
- [x] **FK: TiDB tạo được toàn bộ foreign key → KHÔNG cần `relationMode = "prisma"`**, giữ nguyên schema.
- [x] `prisma db seed` trên TiDB — dữ liệu mẫu ghi thành công (đã kiểm tra qua MySQL Workbench).

### KHÔNG cần làm (nhờ giữ MySQL)

- Không đổi `datasource provider`, không đổi driver adapter.
- **Không xoá / tạo lại `prisma/migrations`** — migration MySQL hiện tại tái sử dụng nguyên vẹn.
- Không sửa các `@db.VarChar / @db.Text / @db.Decimal` trong schema.
- Seed script giữ nguyên (chỉ kiểm tra chạy được trên TiDB nếu chọn phương án A).

### Thiết lập ngoài repo (user làm, có hướng dẫn)

- [ ] Tạo DB: **TiDB Cloud Starter** (region Singapore) *hoặc* **Aiven for MySQL** → lấy connection string + CA cert nếu có
- [ ] Tạo project Vercel, link GitHub repo, set env `DATABASE_URL` (kèm `?connection_limit=1&sslaccept=strict` tùy provider), `CRON_SECRET`
- [ ] Thêm `DATABASE_URL` vào GitHub Actions secrets (cho bước migrate)
- [ ] (Tùy chọn) gắn custom domain

---

## 5. Phương án thay thế (để dành)

- **AWS (Amplify/ECS + RDS MySQL, quản lý bằng Terraform)** — khi app ra thương mại / cần SLA / backup tự động. Viết plan riêng `plans/infra/aws-terraform.md`.
- **Nâng Vercel Pro + PlanetScale** (~25 + 5 USD/tháng) — khi vượt giới hạn Hobby hoặc cần dùng thương mại.

---

## 6. Verify (sau khi Code)

1. **Local**: trỏ `DATABASE_URL` sang DB cloud vừa tạo → `npx prisma migrate deploy` → `npm run dev`
   → đăng ký / đăng nhập / tạo đủ 5 loại giao dịch / xem báo cáo & tỷ giá.
2. **Build production**: `npm run build` pass, không lỗi Prisma engine / adapter / SSL.
3. **Migrate trên DB thật**: ✅ đã chạy — `prisma migrate deploy` sạch trên TiDB, FK tạo đủ,
   không cần `relationMode`. Seed cũng đã chạy.
4. **Preview deploy**: mở PR → Vercel Preview URL → smoke test các luồng chính.
5. **k6 regression**: `API_BASE_URL=<preview-url> npm run test:api` — toàn bộ suite
   auth / account / category / contact / transaction / report pass.
6. **Cron**: `curl -H "Authorization: Bearer $CRON_SECRET" <url>/api/cron/cleanup-sessions` → 200;
   gọi không header → 401.
7. **Connection pressure**: chạy k6 tải nhẹ đồng thời → không có lỗi `too many connections`
   (Aiven trần 76; nếu đụng thì hạ `connection_limit` hoặc chuyển phương án B).

---

## Nguồn (tra cứu 8/2026)

- [Bytebase — MySQL Hosting Options in 2026: Pricing Comparison](https://www.bytebase.com/blog/mysql-hosting-options-pricing-comparison/)
- [Aiven — Free tier](https://aiven.io/free-tier) · [Aiven docs — MySQL free tier](https://aiven.io/docs/products/mysql/concepts/mysql-free-tier)
- [TiDB Docs — TiDB Cloud Starter pricing / quota](https://www.pingcap.com/tidb-cloud-starter-pricing-details/) · [TiDB Cloud Starter FAQs](https://docs.pingcap.com/tidbcloud/serverless-faqs/)
- [PingCAP — "TiDB Cloud Serverless" đổi tên thành "TiDB Cloud Starter"](https://www.pingcap.com/blog/introducing-tidb-cloud-starter-auto-scaling-plan-renamed/)
- [DB Pro — PlanetScale alternatives after Hobby tier removal](https://www.dbpro.app/blog/planetscale-alternatives)
- [srvrlss — PlanetScale Review 2026](https://www.srvrlss.io/provider/planetscale/)
