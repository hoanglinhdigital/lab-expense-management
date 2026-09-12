/**
 * E2E test cho màn hình "Thêm chi tiêu" (Record Expense) — `/record`, loại
 * giao dịch mặc định Expense. Thiết kế theo mockup:
 *   - docs/screenshot/record-expense/record-expense.png
 *   - docs/screenshot/record-expense/record-expense-select-account.png
 *   - docs/screenshot/record-expense/record-expense-select-category.png
 *
 * Ghi chú lệch giữa yêu cầu gốc và hành vi thực tế của code hiện tại (đã xác
 * nhận với người yêu cầu trước khi viết test — test bám theo code):
 *   - Nút "Save" KHÔNG bị disable khi form invalid; bấm Save khi thiếu dữ liệu
 *     chỉ chạy validate() ở client, hiện lỗi đỏ và KHÔNG gọi API.
 *   - Lưu thành công KHÔNG điều hướng đi đâu (ở lại `/record`, form được reset
 *     tại chỗ) và không có toast — thông báo hiển thị inline là "Đã lưu giao
 *     dịch." (không phải "/transactions" + "Đã thêm giao dịch").
 *   - Ghi chú giới hạn bởi `maxLength=200` của input (không phải 500).
 *   - App xác thực bằng cookie `session` httpOnly, không lưu token vào
 *     localStorage — dọn dữ liệu test gọi thẳng `page.request.delete` (dùng
 *     chung cookie phiên với `page`), không cần Bearer token.
 */
import { test, expect } from "./fixtures/auth";
import { test as anonymousTest, expect as anonymousExpect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { RecordExpensePage } from "./pages/RecordExpensePage";

/** Bấm Save, chờ response POST /api/transactions và trả về id giao dịch vừa tạo. */
async function saveAndCaptureId(
  page: Page,
  recordPage: RecordExpensePage,
): Promise<string> {
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes("/api/transactions"),
    ),
    recordPage.save(),
  ]);
  const body = (await response.json()) as { data: { id: string } };
  return body.data.id;
}

/** Xoá giao dịch test vừa tạo qua API — cookie phiên dùng chung với `page`. */
async function cleanupTransaction(page: Page, id: string | undefined) {
  if (!id) return;
  await page.request.delete(`/api/transactions/${id}`);
}

test.describe("Thêm chi tiêu — happy path", () => {
  test("nhập đủ trường bắt buộc, chọn danh mục nhanh (Most used) -> lưu thành công, form reset", async ({
    authedPage,
  }) => {
    const recordPage = new RecordExpensePage(authedPage);
    await recordPage.goto();

    await recordPage.fillAmount("150000");
    await recordPage.selectFirstMostUsedCategory();
    await recordPage.fillNote("Ăn trưa với đồng nghiệp");

    let transactionId: string | undefined;
    try {
      transactionId = await saveAndCaptureId(authedPage, recordPage);

      await expect(recordPage.savedNotice).toBeVisible();
      // Form reset tại chỗ, vẫn ở /record — không điều hướng đi đâu.
      await expect(authedPage).toHaveURL(/\/record$/);
      await expect(recordPage.amountInput).toHaveValue("");
      await expect(recordPage.noteInput).toHaveValue("");
    } finally {
      await cleanupTransaction(authedPage, transactionId);
    }
  });

  test("không nhập ghi chú (tuỳ chọn) vẫn lưu được", async ({ authedPage }) => {
    const recordPage = new RecordExpensePage(authedPage);
    await recordPage.goto();

    await recordPage.fillAmount("20000");
    await recordPage.selectFirstMostUsedCategory();

    let transactionId: string | undefined;
    try {
      transactionId = await saveAndCaptureId(authedPage, recordPage);
      await expect(recordPage.savedNotice).toBeVisible();
    } finally {
      await cleanupTransaction(authedPage, transactionId);
    }
  });

  test("chọn danh mục qua modal Select Category kèm tìm kiếm -> lưu thành công", async ({
    authedPage,
  }) => {
    const recordPage = new RecordExpensePage(authedPage);
    await recordPage.goto();
    await recordPage.fillAmount("50000");

    const categoryDialog = await recordPage.openCategorySheet();
    const firstTile = categoryDialog.locator("button[aria-pressed]").first();
    // CategoryTile render 2 <span>: icon (aria-hidden) rồi tên — chỉ lấy span tên
    // để gõ vào ô tìm kiếm (innerText của cả nút gồm cả icon lẫn xuống dòng).
    const categoryName = (await firstTile.locator("span").last().innerText()).trim();

    await categoryDialog.getByPlaceholder("Enter category name").fill(categoryName);
    const filteredTile = categoryDialog
      .locator("button[aria-pressed]")
      .filter({ hasText: categoryName })
      .first();
    await expect(filteredTile).toBeVisible();
    await filteredTile.click();
    await expect(categoryDialog).toBeHidden();

    let transactionId: string | undefined;
    try {
      transactionId = await saveAndCaptureId(authedPage, recordPage);
      await expect(recordPage.savedNotice).toBeVisible();
    } finally {
      await cleanupTransaction(authedPage, transactionId);
    }
  });

  test("đổi tài khoản qua modal Select Account trước khi lưu -> lưu thành công", async ({
    authedPage,
  }) => {
    const recordPage = new RecordExpensePage(authedPage);
    await recordPage.goto();

    const accountDialog = await recordPage.openAccountSheet();
    const optionCount = await accountDialog.getByRole("button").count();
    test.skip(
      optionCount < 2,
      "Tài khoản test cần ít nhất 2 tài khoản để kiểm tra đổi tài khoản.",
    );

    const targetOption = accountDialog.getByRole("button").nth(1);
    const targetAccountText = (await targetOption.innerText()).trim();
    await targetOption.click();
    await expect(accountDialog).toBeHidden();
    await expect(recordPage.accountButton).toContainText(
      targetAccountText.split("\n")[0],
    );

    await recordPage.fillAmount("30000");
    await recordPage.selectFirstMostUsedCategory();

    let transactionId: string | undefined;
    try {
      transactionId = await saveAndCaptureId(authedPage, recordPage);
      await expect(recordPage.savedNotice).toBeVisible();
    } finally {
      await cleanupTransaction(authedPage, transactionId);
    }
  });

  test("chọn ngày trong tương lai vẫn lưu được", async ({ authedPage }) => {
    const recordPage = new RecordExpensePage(authedPage);
    await recordPage.goto();

    const future = new Date();
    future.setDate(future.getDate() + 7);
    const isoFuture = future.toISOString().slice(0, 10);

    await recordPage.fillAmount("75000");
    await recordPage.selectFirstMostUsedCategory();
    await recordPage.setDate(isoFuture);

    let transactionId: string | undefined;
    try {
      transactionId = await saveAndCaptureId(authedPage, recordPage);
      await expect(recordPage.savedNotice).toBeVisible();
    } finally {
      await cleanupTransaction(authedPage, transactionId);
    }
  });
});

test.describe("Thêm chi tiêu — validate / edge case", () => {
  test("mặc định vào màn hình lấy ngày giờ hiện tại", async ({ authedPage }) => {
    const recordPage = new RecordExpensePage(authedPage);
    await recordPage.goto();

    const today = new Date();
    const isoToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate(),
    ).padStart(2, "0")}`;

    await expect(recordPage.dateInput).toHaveValue(isoToday);
    await expect(recordPage.timeInput).not.toHaveValue("");
  });

  test("bỏ trống số tiền -> hiện lỗi đỏ và không gọi API", async ({
    authedPage,
  }) => {
    const recordPage = new RecordExpensePage(authedPage);
    await recordPage.goto();
    await recordPage.selectFirstMostUsedCategory();

    let apiCalled = false;
    authedPage.on("request", (request) => {
      if (
        request.method() === "POST" &&
        request.url().includes("/api/transactions")
      ) {
        apiCalled = true;
      }
    });

    await recordPage.save();

    await expect(recordPage.amountError).toBeVisible();
    expect(apiCalled).toBe(false);
  });

  test("không chọn danh mục -> hiện lỗi đỏ và không gọi API", async ({
    authedPage,
  }) => {
    const recordPage = new RecordExpensePage(authedPage);
    await recordPage.goto();
    await recordPage.fillAmount("10000");

    let apiCalled = false;
    authedPage.on("request", (request) => {
      if (
        request.method() === "POST" &&
        request.url().includes("/api/transactions")
      ) {
        apiCalled = true;
      }
    });

    await recordPage.save();

    await expect(recordPage.categoryError).toBeVisible();
    expect(apiCalled).toBe(false);
  });

  test("ghi chú bị giới hạn tối đa 200 ký tự", async ({ authedPage }) => {
    const recordPage = new RecordExpensePage(authedPage);
    await recordPage.goto();

    const longNote = "a".repeat(250);
    await recordPage.fillNote(longNote);

    await expect(recordPage.noteInput).toHaveValue("a".repeat(200));
  });
});

test.describe("Thêm chi tiêu — negative case", () => {
  anonymousTest(
    "chưa đăng nhập -> vào /record bị điều hướng về /login",
    async ({ page }) => {
      await page.goto("/record");
      await page.waitForURL(/\/login$/);
      await anonymousExpect(page).toHaveURL(/\/login$/);
    },
  );

  test("nhập số tiền 0 -> hiện lỗi đỏ và không gọi API", async ({
    authedPage,
  }) => {
    const recordPage = new RecordExpensePage(authedPage);
    await recordPage.goto();
    await recordPage.fillAmount("0");
    await recordPage.selectFirstMostUsedCategory();

    let apiCalled = false;
    authedPage.on("request", (request) => {
      if (
        request.method() === "POST" &&
        request.url().includes("/api/transactions")
      ) {
        apiCalled = true;
      }
    });

    await recordPage.save();

    await expect(recordPage.amountError).toBeVisible();
    expect(apiCalled).toBe(false);
  });
});
