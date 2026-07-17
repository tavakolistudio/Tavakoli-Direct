import { expect, test } from '@playwright/test';

/**
 * Critical-path scenario (acceptance §27):
 *   1. Admin logs in
 *   2. Admin creates a client
 *   3. Admin creates a keyword automation
 *   4. Admin tests the automation in dry-run mode (no real message sent)
 *   5–7. Mock DM → queued reply → inbox: exercised by the worker integration test
 *        (apps/worker webhook-event.integration.test) which runs the same pipeline
 *   8. Operator adds an internal note (on a seeded conversation)
 *   9. Operator resolves the conversation
 *
 * Requires a migrated + seeded database and the built app running.
 */

const ADMIN = { email: 'admin@tavakoli.local', password: 'Admin!12345' };

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('ایمیل').fill(email);
  await page.getByLabel('رمز عبور').fill(password);
  await page.getByRole('button', { name: 'ورود' }).click();
  await page.waitForURL('**/dashboard');
}

test('admin can log in and reach the dashboard', async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await expect(page.getByRole('heading', { name: 'داشبورد' })).toBeVisible();
});

test('admin creates a client', async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto('/clients/new');
  const name = `مجموعه تست ${Date.now()}`;
  await page.getByLabel('نام مجموعه').fill(name);
  await page.getByRole('button', { name: 'ذخیره مجموعه' }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
});

test('admin creates a keyword automation and runs the dry-run tester', async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto('/automations/new');

  await page.getByLabel('نام اتوماسیون').fill(`تست قیمت ${Date.now()}`);
  await page.getByLabel('کلمات کلیدی (با کاما یا خط جدید جدا کنید)').fill('قیمت، هزینه');
  await page.getByLabel('متن پاسخ').fill('سلام، تعرفه خدمات را ارسال می‌کنیم.');
  await page.getByRole('button', { name: 'ساخت و ذخیره' }).click();

  // On the automation detail page, run the dry-run tester.
  await expect(page.getByRole('heading', { name: 'گام آزمایش (بدون ارسال واقعی)' })).toBeVisible();
  await page.getByRole('button', { name: 'آزمایش بدون ارسال واقعی' }).click();
  await expect(page.getByText('اتوماسیون منتخب:')).toBeVisible();
});

test('operator adds an internal note and resolves a seeded conversation', async ({ page }) => {
  await login(page, ADMIN.email, ADMIN.password);
  await page.goto('/inbox');
  // Open the first conversation in the list.
  await page.locator('a[href^="/inbox/"]').first().click();
  await expect(page.getByText('یادداشت داخلی', { exact: false })).toBeVisible();

  await page.getByPlaceholder('یادداشت فقط برای تیم…').fill('پیگیری تلفنی انجام شد.');
  await page.getByRole('button', { name: 'ثبت یادداشت داخلی' }).click();
  await expect(page.getByText('یادداشت داخلی ثبت شد.')).toBeVisible();

  await page.getByRole('button', { name: 'بستن گفتگو' }).click();
  await expect(page.getByText('وضعیت به‌روزرسانی شد.')).toBeVisible();
});
