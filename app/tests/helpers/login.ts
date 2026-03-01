import { Page } from '@playwright/test';

export type UserRole = 'employee' | 'manager' | 'hr' | 'admin' | 'gm';

// 默认测试账号
export const TEST_ACCOUNTS: Record<UserRole, { username: string; password: string }> = {
  employee: { username: 'employee1', password: '123456' },
  manager: { username: 'manager1', password: '123456' },
  hr: { username: 'hr1', password: '123456' },
  admin: { username: 'admin', password: '123456' },
  gm: { username: 'gm1', password: '123456' },
};

/**
 * 登录指定角色
 */
export async function loginAs(page: Page, role: UserRole) {
  const account = TEST_ACCOUNTS[role];
  await page.goto('/login');
  
  // 点击对应角色的 tab
  const tabMap: Record<UserRole, string> = {
    employee: '员工',
    manager: '经理',
    hr: 'HR',
    admin: '管理员',
    gm: '总经理',
  };
  
  // 点击角色tab
  const tabText = tabMap[role];
  await page.getByRole('tab', { name: new RegExp(tabText) }).click();
  
  // 填写用户名和密码
  await page.getByLabel('用户名').fill(account.username);
  await page.getByLabel('密码').fill(account.password);
  
  // 提交
  await page.getByRole('button', { name: /登录/ }).click();
  
  // 等待导航完成
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}
