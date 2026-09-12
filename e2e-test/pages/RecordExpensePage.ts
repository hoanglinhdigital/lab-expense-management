import { type Locator, type Page, expect } from "@playwright/test";

/**
 * Page Object cho màn hình "Ghi giao dịch" (`/record`), ở loại giao dịch mặc
 * định khi vào màn hình — Expense (xem `createInitialForm()` trong
 * `RecordScreen.tsx`). Chỉ bọc thao tác UI dùng trong test, không gọi API
 * trực tiếp (việc dọn dữ liệu test nằm ở spec, qua `page.request`).
 */
export class RecordExpensePage {
  readonly page: Page;
  readonly amountInput: Locator;
  readonly noteInput: Locator;
  readonly saveButton: Locator;
  /** AccountRow là nút duy nhất hiển thị dấu "·" giữa tên tài khoản và tiền tệ. */
  readonly accountButton: Locator;
  readonly dateInput: Locator;
  readonly timeInput: Locator;
  readonly amountError: Locator;
  readonly categoryError: Locator;
  readonly savedNotice: Locator;

  constructor(page: Page) {
    this.page = page;
    this.amountInput = page.getByLabel("Amount");
    this.noteInput = page.getByLabel("Ghi chú");
    this.saveButton = page.getByRole("button", { name: "Save", exact: true });
    this.accountButton = page.getByRole("button", { name: /·/ });
    this.dateInput = page.locator('input[type="date"]');
    this.timeInput = page.locator('input[type="time"]');
    this.amountError = page.getByText("Vui lòng nhập số tiền lớn hơn 0.");
    this.categoryError = page.getByText("Vui lòng chọn danh mục.");
    this.savedNotice = page.getByText("Đã lưu giao dịch.");
  }

  async goto() {
    await this.page.goto("/record");
    await expect(this.amountInput).toBeVisible();
  }

  async fillAmount(value: string) {
    await this.amountInput.fill(value);
  }

  async fillNote(value: string) {
    await this.noteInput.fill(value);
  }

  /** Chọn ô danh mục đầu tiên trong khối "Most used" (CategoryTile có aria-pressed). */
  async selectFirstMostUsedCategory() {
    await this.page.locator("button[aria-pressed]").first().click();
  }

  /** Mở modal "Select Category" (nút "All" của CategoryPickerCard). */
  async openCategorySheet(): Promise<Locator> {
    await this.page.getByRole("button", { name: "All" }).click();
    const dialog = this.page.getByRole("dialog", { name: "Select Category" });
    await expect(dialog).toBeVisible();
    return dialog;
  }

  /** Mở modal "Select Account" (AccountRow). */
  async openAccountSheet(): Promise<Locator> {
    await this.accountButton.click();
    const dialog = this.page.getByRole("dialog", { name: "Select Account" });
    await expect(dialog).toBeVisible();
    return dialog;
  }

  async setDate(isoDate: string) {
    await this.dateInput.fill(isoDate);
  }

  async save() {
    await this.saveButton.click();
  }
}
