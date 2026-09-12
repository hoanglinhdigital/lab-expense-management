/**
 * Fixture đăng nhập chung cho các test cần phiên đăng nhập.
 *
 * App xác thực bằng cookie `session` httpOnly (`credentials: "include"`,
 * xem `src/lib/api/client.ts`) — KHÔNG lưu token vào localStorage. Vì vậy
 * fixture đăng nhập qua UI (`/login`) rồi trả về `page` đã có cookie phiên,
 * dùng luôn được cho cả thao tác UI lẫn `page.request.*` (API dọn dữ liệu)
 * vì `page.request` dùng chung cookie jar với `page`.
 *
 * Biến môi trường đọc từ `.env` (nạp qua `dotenv/config`, không cần sửa
 * `playwright.config.ts`): ưu tiên `E2E_EMAIL` / `E2E_PASSWORD`, nếu thiếu thì
 * dùng lại `TEST_A_EMAIL` / `TEST_A_PASSWORD` (đã có sẵn cho test k6 khác).
 */
import "dotenv/config";
import { test as base, expect, type Page } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL || process.env.TEST_A_EMAIL || "";
const PASSWORD = process.env.E2E_PASSWORD || process.env.TEST_A_PASSWORD || "";

export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    if (!EMAIL || !PASSWORD) {
      throw new Error(
        "Thiếu tài khoản test: hãy đặt E2E_EMAIL và E2E_PASSWORD " +
          "(hoặc TEST_A_EMAIL / TEST_A_PASSWORD) trong file .env ở gốc project.",
      );
    }

    await page.goto("/login");
    await page.getByRole("textbox", { name: "Email" }).fill(EMAIL);
    await page.getByRole("textbox", { name: "Mật khẩu" }).fill(PASSWORD);
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();

    // Đăng nhập thành công điều hướng về "/" (xem LoginForm.tsx).
    await page.waitForURL((url) => url.pathname === "/");

    await use(page);
  },
});

export { expect };
