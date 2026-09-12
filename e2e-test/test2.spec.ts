import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://claude101expensemanagement.vercel.app/login');
  await page.getByRole('textbox', { name: 'Email' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill('testuser-a@gmail.com');
  await page.getByRole('textbox', { name: 'Mật khẩu' }).click();
  await page.getByRole('textbox', { name: 'Mật khẩu' }).fill('123456789');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.getByRole('link', { name: 'Record' }).click();
  await page.getByRole('button', { name: 'Di chuyển' }).click();
  await page.getByRole('textbox', { name: 'Amount' }).click();
  await page.getByRole('textbox', { name: 'Amount' }).fill('20,0000');
  await page.getByRole('textbox', { name: 'Ghi chú' }).click();
  await page.getByRole('textbox', { name: 'Ghi chú' }).fill('Grab');
  await page.getByRole('button', { name: 'TC Account 2 1788681756432 ·' }).click();
  await page.getByRole('button', { name: 'TC Account 2 1788681756432 96' }).click();
  await page.getByRole('button', { name: 'Save' }).click();

  const recored = page.getByText('Đã lưu giao dịch.');
  await expect(recored).toBeVisible();
});