/**
 * Chạy một script k6 với biến môi trường nạp sẵn từ `.env`.
 *
 * k6 KHÔNG tự đọc `.env` — nó chỉ thấy biến môi trường thật của tiến trình (hoặc
 * cờ `-e KEY=value`). Runner này nạp `.env` vào `process.env` rồi spawn `k6 run`,
 * nhờ `--include-system-env-vars` (mặc định bật) mà `__ENV.*` trong script đọc
 * được các biến đó.
 *
 * Dùng:
 *   node test/run-with-env.mjs test/transaction/expense/testscript.js [k6 args...]
 */

import { spawnSync } from "node:child_process";
import { config } from "dotenv";

config(); // nạp .env ở thư mục gốc project vào process.env (không ghi đè biến đã có)

const [script, ...rest] = process.argv.slice(2);
if (!script) {
  console.error("Thiếu đường dẫn script k6. Ví dụ: node test/run-with-env.mjs test/transaction/expense/testscript.js");
  process.exit(2);
}

const result = spawnSync("k6", ["run", script, ...rest], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32", // để tìm k6.exe qua PATH trên Windows
});

if (result.error) {
  console.error(`Không chạy được k6: ${result.error.message}`);
  console.error("Cài k6: https://grafana.com/docs/k6/latest/set-up/install-k6/");
  process.exit(1);
}
process.exit(result.status ?? 1);
