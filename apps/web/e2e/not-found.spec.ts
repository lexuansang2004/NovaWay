import { expect, test } from '@playwright/test';

// Trước khi có catch-all `path="*"` trong App.tsx, mọi URL không khớp route
// nào render trang trắng hoàn toàn: không lỗi console, không Sidebar (route
// không khớp thì nằm ngoài cả group <Route element={<AppLayout />}>), không
// lối quay lại. Hai test dưới khoá lại cả hai nhánh auth của catch-all.

const API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://localhost:3000/api';

test('unknown URL while logged in shows the 404 page with a way back', async ({ page, request }) => {
  const email = `e2e-404-${Date.now()}-${Math.floor(Math.random() * 10_000)}@example.com`;
  const password = 'E2ePass123!';

  const res = await request.post(`${API_BASE_URL}/auth/register`, { data: { email, password } });
  expect(res.ok(), await res.text()).toBeTruthy();

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Mật khẩu').fill(password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  await page.goto('/khong-ton-tai');
  await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible();
  // Sidebar vẫn còn — đây là lý do catch-all nằm trong AppLayout.
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();

  await page.getByRole('button', { name: 'Về Dashboard' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

test('unknown URL while logged out redirects to login, same as any protected route', async ({
  page,
}) => {
  await page.goto('/khong-ton-tai');
  await expect(page).toHaveURL(/\/login/);
});
