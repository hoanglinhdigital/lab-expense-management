import { test, expect } from '@playwright/test';

// test()  : khai báo một kịch bản kiểm thử
test('trang đăng nhập hiển thị đúng', async ({ page }) => {
  // page   : 1 tab trình duyệt do Playwright điều khiển
  await page.goto('/login');

  // locator: trỏ tới phần tử theo VAI TRÒ / nhãn, không dùng CSS dễ vỡ
  const emailInput = page.getByLabel('Email');
  const submitBtn = page.getByRole('button', { name: 'Đăng nhập', exact: true });

  // expect : khẳng định trạng thái mong đợi (tự auto-wait)
  await expect(emailInput).toBeVisible();
  await expect(submitBtn).toBeEnabled();
});

test('input email đăng nhập hiển thị thành công', async ({ page }) => {
  await page.goto('/login');

  // locator: trỏ theo ID phần tử qua CSS id selector
  const emailInput = page.locator('#login-email');

  await expect(emailInput).toBeVisible();
});

test('input password đăng nhập hiển thị thành công', async ({ page }) => {
  await page.goto('/login');

  const passwordInput = page.locator('#login-password');

  await expect(passwordInput).toBeVisible();
});