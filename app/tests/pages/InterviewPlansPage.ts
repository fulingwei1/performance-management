import { Page } from '@playwright/test';

/**
 * 面谈计划页面对象
 */
export class InterviewPlansPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/manager/dashboard');
    await this.page.getByText('面谈计划').click();
    await this.page.waitForLoadState('networkidle');
  }

  async createPlan(data: { title: string; description: string; scheduledDate: string }) {
    await this.page.getByText('创建面谈计划').click();

    // 填写标题
    const titleInput = this.page.locator('input[placeholder*="面谈"], input[type="text"]').first();
    await titleInput.fill(data.title);

    // 填写说明
    const descTextarea = this.page.locator('textarea').first();
    if (await descTextarea.isVisible()) {
      await descTextarea.fill(data.description);
    }

    // 日期
    const dateInput = this.page.locator('input[type="date"]').first();
    await dateInput.fill(data.scheduledDate);

    // 提交
    await this.page.getByRole('button', { name: /创建|保存/ }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async getPlanCount() {
    return this.page.locator('.bg-white.rounded-lg.shadow, [data-testid="plan-card"]').count();
  }

  async getPlanTitles() {
    return this.page.locator('h3, .font-semibold').allTextContents();
  }
}
