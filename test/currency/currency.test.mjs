/** Test case G1–G14 — `plans/backend/06_currency.md`, spec `docs/api-spec/currency.yaml`. */

export const name = "currency";
export const deps = ["auth"];

export async function run(ctx) {
  const { A, anon, check } = ctx;

  let r = await A.call("GET", "/currencies");
  check("G1", r.status === 200 && r.body?.data?.[0]?.code === "VND", JSON.stringify(r.body?.data?.[0]));
  check(
    "G1-cache",
    (r.headers.get("cache-control") ?? "").includes("max-age=86400"),
    r.headers.get("cache-control"),
  );

  r = await A.call("GET", "/currencies?keyword=usd");
  check(
    "G2",
    r.status === 200 && r.body.data.length === 1 && r.body.data[0].code === "USD",
    JSON.stringify(r.body?.data),
  );

  r = await A.call("GET", "/currencies?pageSize=201");
  check("G3", r.status === 400, `${r.status}`);

  r = await anon.call("GET", "/currencies");
  check("G4", r.status === 401, `${r.status}`);

  r = await A.call("GET", "/utility/exchange-rate");
  check(
    "G5",
    r.status === 200 && r.body?.meta?.base === "VND" && !r.body.data.some((x) => x.code === "VND"),
    JSON.stringify(r.body?.meta),
  );

  r = await A.call("GET", "/utility/exchange-rate?base=USD");
  check(
    "G6",
    r.status === 200 && r.body.meta.base === "USD" && r.body.data.every((x) => x.base === "USD"),
    JSON.stringify(r.body?.meta),
  );

  r = await A.call("GET", "/utility/exchange-rate?codes=USD,EUR");
  check("G7", r.status === 200 && r.body.data.length === 2, JSON.stringify(r.body?.data?.map((x) => x.code)));

  r = await A.call("GET", "/utility/exchange-rate?codes=USD,USD");
  check("G8", r.status === 200 && r.body.data.length === 1, JSON.stringify(r.body?.data?.map((x) => x.code)));

  r = await A.call("GET", "/utility/exchange-rate?codes=VND");
  check("G9", r.status === 200 && r.body.data.length === 0, JSON.stringify(r.body?.data));

  r = await A.call("GET", "/utility/exchange-rate?base=XYZ");
  check("G10", r.status === 404 && r.body?.error?.code === "CURRENCY_NOT_SUPPORTED", JSON.stringify(r.body));

  r = await A.call("GET", "/utility/exchange-rate?base=US");
  check("G11", r.status === 400 && r.body?.error?.details?.base, JSON.stringify(r.body));

  r = await A.call("GET", "/utility/exchange-rate?codes=USD,XYZ");
  check("G12", r.status === 404, JSON.stringify(r.body));

  // EUR không được seed làm `base`, tỷ giá phải suy ra bắc cầu qua VND.
  r = await A.call("GET", "/utility/exchange-rate?base=EUR&codes=VND");
  const eurVnd = r.body?.data?.[0];
  check(
    "G13",
    r.status === 200 && eurVnd && Number(eurVnd.rate) > 0 && Number(eurVnd.rate) < 1,
    `1 VND = ${eurVnd?.rate} EUR`,
  );
  check("G14", Boolean(eurVnd?.updatedAt), "thiếu updatedAt");
}
