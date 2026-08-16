/**
 * Test case G1–G14 — `plans/backend/06_currency.md`, spec `docs/api-spec/currency.yaml`.
 *
 * Chạy lẻ:  k6 run test/currency/currency.test.js
 */

import { waitForServer } from "../lib/http.js";
import { createContext, bootstrapAuth } from "../lib/fixtures.js";
import { expect, moduleGroup } from "../lib/expect.js";
import { baseOptions } from "../lib/options.js";

export const options = baseOptions;
export const name = "currency";

export function run(ctx) {
  const { A, anon } = ctx;

  let r = A.call("GET", "/currencies");
  expect("G1", r.status === 200 && r.body?.data?.[0]?.code === "VND", JSON.stringify(r.body?.data?.[0]));
  expect(
    "G1-cache",
    (r.headers["Cache-Control"] ?? "").includes("max-age=86400"),
    r.headers["Cache-Control"],
  );

  r = A.call("GET", "/currencies?keyword=usd");
  expect(
    "G2",
    r.status === 200 && r.body.data.length === 1 && r.body.data[0].code === "USD",
    JSON.stringify(r.body?.data),
  );

  r = A.call("GET", "/currencies?pageSize=201");
  expect("G3", r.status === 400, `${r.status}`);

  r = anon.call("GET", "/currencies");
  expect("G4", r.status === 401, `${r.status}`);

  r = A.call("GET", "/utility/exchange-rate");
  expect(
    "G5",
    r.status === 200 && r.body?.meta?.base === "VND" && !r.body.data.some((x) => x.code === "VND"),
    JSON.stringify(r.body?.meta),
  );

  r = A.call("GET", "/utility/exchange-rate?base=USD");
  expect(
    "G6",
    r.status === 200 && r.body.meta.base === "USD" && r.body.data.every((x) => x.base === "USD"),
    JSON.stringify(r.body?.meta),
  );

  r = A.call("GET", "/utility/exchange-rate?codes=USD,EUR");
  expect("G7", r.status === 200 && r.body.data.length === 2, JSON.stringify(r.body?.data?.map((x) => x.code)));

  r = A.call("GET", "/utility/exchange-rate?codes=USD,USD");
  expect("G8", r.status === 200 && r.body.data.length === 1, JSON.stringify(r.body?.data?.map((x) => x.code)));

  r = A.call("GET", "/utility/exchange-rate?codes=VND");
  expect("G9", r.status === 200 && r.body.data.length === 0, JSON.stringify(r.body?.data));

  r = A.call("GET", "/utility/exchange-rate?base=XYZ");
  expect("G10", r.status === 404 && r.body?.error?.code === "CURRENCY_NOT_SUPPORTED", JSON.stringify(r.body));

  r = A.call("GET", "/utility/exchange-rate?base=US");
  expect("G11", r.status === 400 && r.body?.error?.details?.base, JSON.stringify(r.body));

  r = A.call("GET", "/utility/exchange-rate?codes=USD,XYZ");
  expect("G12", r.status === 404, JSON.stringify(r.body));

  // EUR không được seed làm `base`, tỷ giá phải suy ra bắc cầu qua VND.
  r = A.call("GET", "/utility/exchange-rate?base=EUR&codes=VND");
  const eurVnd = r.body?.data?.[0];
  expect(
    "G13",
    r.status === 200 && eurVnd && Number(eurVnd.rate) > 0 && Number(eurVnd.rate) < 1,
    `1 VND = ${eurVnd?.rate} EUR`,
  );
  expect("G14", Boolean(eurVnd?.updatedAt), "thiếu updatedAt");
}

export default function main() {
  if (!waitForServer()) throw new Error("không kết nối được tới API — chạy `npm run dev` trước");

  const ctx = bootstrapAuth(createContext());
  moduleGroup(name, () => run(ctx));
}
