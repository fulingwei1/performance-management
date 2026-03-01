import { Page, expect } from '@playwright/test';

/**
 * HR 互评管理页面对象
 */
export class PeerReviewManagementPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/hr/dashboard');
    // 导航到互评管理
    await this.page.getByText('360度互评管理').click();
    await this.page.waitForLoadState('networkidle');
  }

  async createCycle(data: { name: string; description: string; startDate: string; endDate: string }) {
    await this.page.getByText('创建互评周期').click();
    
    // 填写表单
    await this.page.locator('input[placeholder*="互评"]').fill(data.name);
    await this.page.locator('textarea[placeholder*="互评"]').fill(data.description);
    
    // 日期
    const dateInputs = this.page.locator('input[type="date"]');
    await dateInputs.nth(0).fill(data.startDate);
    await dateInputs.nth(1).fill(data.endDate);

    // 提交
    await this.page.getByRole('button', { name: '创建' }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async configureRelationships(cycleName: string) {
    // 找到对应周期卡片，点击配置
    const card = this.page.locator('div').filter({ hasText: cycleName }).first();
    await card.getByText('配置评价关系').click();
    await this.page.waitForLoadState('networkidle');
  }

  async addRelationship(reviewerId: string, revieweeId: string) {
    // 选择评价人和被评价人
    const selects = this.page.locator('select');
    if (await selects.count() >= 2) {
      await selects.nth(0).selectOption(reviewerId);
      await selects.nth(1).selectOption(revieweeId);
    }
    await this.page.getByRole('button', { name: /添加/ }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async getStatsValues() {
    const stats = this.page.locator('.grid.grid-cols-1.md\\:grid-cols-4 .text-2xl');
    const values: string[] = [];
    const count = await stats.count();
    for (let i = 0; i < count; i++) {
      values.push(await stats.nth(i).textContent() || '');
    }
    return values;
  }

  async getCycleNames() {
    return this.page.locator('h3').allTextContents();
  }
}
