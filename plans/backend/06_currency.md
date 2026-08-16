# Plan Backend 06 — Currency & Exchange rate

Nguồn: `docs/api-spec/currency.yaml`. Phụ thuộc: `plans/backend/00_foundation.md`.

## 1. Endpoint

| Method | Path | Mô tả |
|---|---|---|
| GET | `/api/currencies` | Danh sách tiền tệ hỗ trợ, thứ tự cố định |
| GET | `/api/utility/exchange-rate` | Tỷ giá quy về `base` (mặc định `defaultCurrency` của user) |

Dữ liệu dùng chung mọi user nhưng **vẫn yêu cầu đăng nhập** đúng như spec.

## 2. Nguồn dữ liệu

Bảng `Currency` và `ExchangeRate` thêm ở plan 00, seed trong `prisma/seed.ts`:

- `Currency`: VND, USD, EUR, JPY, KRW, CNY, GBP, AUD, SGD, THB — kèm `symbol`, `decimalDigits` (VND/JPY/KRW = 0, còn lại = 2), `region`, `sortOrder` (VND đầu tiên).
- `ExchangeRate`: `@@unique([base, code])`. Seed cặp hai chiều cho `base ∈ {VND, USD}`.

**Ý nghĩa `rate`** (theo spec): số đơn vị `base` đổi được từ **1 đơn vị** `code`. `base=VND`, `code=USD`, `rate=25400` ⇒ 1 USD = 25 400 VND.

Nếu thiếu cặp `(base, code)` trực tiếp trong bảng, service quy đổi bắc cầu qua `VND`: `rate(base→code) = rate(VND, code) / rate(VND, base)`. Không suy ra được → `404 CURRENCY_NOT_SUPPORTED`.

## 3. Query params

**`/currencies`**: `page` (≥1, mặc định 1), `pageSize` (1–200, mặc định 50), `keyword` (`contains` trên `code` hoặc `name`). Sắp xếp cố định `sortOrder ASC, code ASC` để sheet chọn tiền tệ luôn hiển thị như nhau. Response set `Cache-Control: public, max-age=86400`.

**`/utility/exchange-rate`**:
- `base` — 3 ký tự, viết hoa; bỏ trống = `defaultCurrency` của user. Không hỗ trợ → `404 CURRENCY_NOT_SUPPORTED`, `details.base`.
- `codes` — chuỗi phân tách bằng dấu phẩy; mã lạ → `404` kèm `details.codes`. Bỏ trống = mọi tiền tệ **trừ** chính `base`.
- `page` / `pageSize` như trên.
- `meta` kèm `base` ngoài `page`/`pageSize`/`total`.

## 4. Edge case

| Tình huống | Kết quả |
|---|---|
| `base` = 2 ký tự | `400`, `details.base` |
| `base = "xyz"` (chữ thường, 3 ký tự) | Chuẩn hoá thành `XYZ` rồi mới tra → `404` |
| `codes` chứa `base` | Loại `base` khỏi kết quả, không lỗi |
| `codes` có mã trùng lặp | Khử trùng lặp |
| `codes=""` | Coi như không truyền |
| `base` hợp lệ nhưng bảng `ExchangeRate` chưa có cặp nào | Trả `data: []`, `meta.total = 0` — không phải lỗi |
| Chưa đăng nhập | `401 UNAUTHORIZED` (kể cả `/currencies`) |

## 5. Hạng mục

### Thêm file

- `src/app/api/currencies/route.ts` — `GET`
- `src/app/api/utility/exchange-rate/route.ts` — `GET`
- `src/lib/services/currency.service.ts` — `listCurrencies`, `listExchangeRates`, `assertCurrencySupported(code)`, `loadRateMap(base)`
- `src/lib/api/schemas/currency.schema.ts`
- `src/lib/api/serializers/currency.serializer.ts`

### Sửa file

- `src/lib/domain/money.ts` (tạo ở plan 00) — dùng `loadRateMap()` của service này làm nguồn tỷ giá, gồm cả suy luận bắc cầu qua VND.

### Xóa file

- Không xoá file nào.

## 6. Test case

| # | Tình huống | Kỳ vọng |
|---|---|---|
| G1 | GET `/currencies` | `200`, VND đứng đầu, có header `Cache-Control` |
| G2 | GET `/currencies?keyword=usd` | Khớp không phân biệt hoa thường |
| G3 | GET `/currencies?pageSize=201` | `400` |
| G4 | GET `/currencies` không đăng nhập | `401 UNAUTHORIZED` |
| G5 | GET `/utility/exchange-rate` (user `defaultCurrency = VND`) | `meta.base = "VND"`, `data` không chứa VND |
| G6 | GET `?base=USD` | `meta.base = "USD"`, mọi item `base = "USD"` |
| G7 | GET `?codes=USD,EUR` | Đúng 2 item |
| G8 | GET `?codes=USD,USD` | 1 item |
| G9 | GET `?codes=VND` khi `base=VND` | `data: []`, không lỗi |
| G10 | GET `?base=XYZ` | `404 CURRENCY_NOT_SUPPORTED`, `details.base` |
| G11 | GET `?base=US` | `400`, `details.base` |
| G12 | GET `?codes=USD,XYZ` | `404`, `details.codes` |
| G13 | `?base=EUR` (không seed trực tiếp) | Suy ra bắc cầu qua VND, `rate` hợp lý |
| G14 | Mọi item có `updatedAt` | Lấy từ bản ghi DB, không hardcode |

## 7. Checklist

- [x] Viết `src/lib/api/schemas/currency.schema.ts`
- [x] Viết `src/lib/api/serializers/currency.serializer.ts`
- [x] Viết `src/lib/services/currency.service.ts` (gồm quy đổi bắc cầu qua VND)
- [x] Nối `src/lib/domain/money.ts` vào `currency.service.ts`
- [x] Viết route `GET /api/currencies`
- [x] Viết route `GET /api/utility/exchange-rate`
- [x] Chạy `npm run lint` + `npm run build`
- [x] Chạy test script kiểm chứng G1–G14
