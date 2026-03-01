import { Page } from '@playwright/test';

/**
 * 面谈记录页面对象
 */
export class InterviewRecordPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/manager/dashboard');
    await this.page.getByText('面谈记录').click();
    await this.page.waitForLoadState('networkidle');
  }

  async createRecord(data: {
    summary: string;
    achievements: string;
    improvements: string;
    nextSteps: string;
  }) {
    await this.page.getByText(/创建面谈记录|新建记录/).click();

    const textareas = this.page.locator('textarea');
    const count = await textareas.count();

    if (count >= 1) await textareas.nth(0).fill(data.summary);
    if (count >= 2) await textareas.nth(1).fill(data.achievements);
    if (count >= 3) await textareas.nth(2).fill(data.improvements);
    if (count >= 4) await textareas.nth(3).fill(data.nextSteps);

    await this.page.getByRole('button', { name: /保存|提交/ }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async createImprovementPlan(data: {
    title: string;
    description: string;
    targetDate: string;
  }) {
    await this.page.getByText(/改进计划|创建改进/).click();

    const titleInput = this.page.locator('input[type="text"]').first();
    await titleInput.fill(data.title);

    const textarea = this.page.locator('textarea').first();
    if (await textarea.isVisible()) {
      await textarea.fill(data.description);
    }

    const dateInput = this.page.locator('input[type="date"]').first();
    await dateInput.fill(data.targetDate);

    await this.page.getByRole('button', { name: /保存|创建/ }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async updateProgress(progressText: string) {
    await this.page.getByText(/更新进度/).click();

    const textarea = this.page.locator('textarea').first();
    await textarea.fill(progressText);

    await this.page.getByRole('button', { name: /保存|更新/ }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async getRecordCount() {
    return this.page.locator('.bg-white.rounded-lg.shadow, [data-testid="record-card"]').count();
  }
}
