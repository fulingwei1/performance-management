import { Page, expect } from '@playwright/test';

/**
 * 员工互评页面对象
 */
export class PeerReviewPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/employee/dashboard');
    await this.page.getByText('360度互评').click();
    await this.page.waitForLoadState('networkidle');
  }

  async getPendingReviews() {
    return this.page.locator('[data-testid="review-item"], .review-item, .bg-white.rounded-lg.shadow').count();
  }

  async submitReview(index: number, scores: Record<string, number>, comment: string) {
    // 点击第 index 个待评价项
    const reviewItems = this.page.locator('.bg-white.rounded-lg.shadow, [data-testid="review-item"]');
    await reviewItems.nth(index).click();

    // 填写评分 - 使用滑块或输入框
    const scoreInputs = this.page.locator('input[type="range"], input[type="number"]');
    const scoreValues = Object.values(scores);
    const inputCount = await scoreInputs.count();
    
    for (let i = 0; i < Math.min(inputCount, scoreValues.length); i++) {
      await scoreInputs.nth(i).fill(String(scoreValues[i]));
    }

    // 填写评语
    const textarea = this.page.locator('textarea').first();
    if (await textarea.isVisible()) {
      await textarea.fill(comment);
    }

    // 提交
    await this.page.getByRole('button', { name: /提交/ }).click();
    await this.page.waitForLoadState('networkidle');
  }
}
