import { expect, test } from '@playwright/test';

test('unauthenticated users are redirected to login', async ({ page }) => {
  await page.goto('/employee/dashboard');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'ATE绩效管理平台' })).toBeVisible();
});

test('employee with temporary password must change password before entering the system', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('用户名（工号/姓名）').fill('e001');
  await page.getByLabel('身份证后六位（管理员可填密码）').fill('123456');
  await page.getByRole('button', { name: '登录' }).click();

  await expect(page).toHaveURL(/\/change-password$/);
  await expect(page.getByText('请修改登录密码')).toBeVisible();

  await page.getByLabel('当前密码').fill('123456');
  await page.getByLabel('新密码', { exact: true }).fill('E2ePass123!');
  await page.getByLabel('确认新密码').fill('E2ePass123!');
  await page.getByRole('button', { name: '修改密码并进入系统' }).click();

  await expect(page).toHaveURL(/\/employee\/dashboard$/);
  await expect(page.getByText(/欢迎回来/)).toBeVisible();
});
