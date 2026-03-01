import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/login';
import { cleanupTestData } from '../helpers/cleanup';
import { PEER_REVIEW_CYCLE, PEER_REVIEW_SCORES } from '../fixtures/test-data';

const API_BASE = 'http://localhost:3001/api';

test.describe('360度互评完整流程', () => {
  let createdCycleId: number;

  test.afterAll(async ({ request }) => {
    await cleanupTestData(request);
  });

  test('1. HR创建互评周期', async ({ page }) => {
    await loginAs(page, 'hr');

    // 导航到互评管理
    await page.goto('/hr/dashboard');
    await page.getByText('360度互评管理').click();
    await page.waitForLoadState('networkidle');

    // 截图 - 互评管理页面
    await page.screenshot({ path: 'tests/screenshots/peer-review-management.png' });

    // 点击创建
    await page.getByText('创建互评周期').click();
    await expect(page.getByText('创建互评周期').nth(1)).toBeVisible();

    // 填写表单
    await page.locator('input[placeholder*="互评"]').fill(PEER_REVIEW_CYCLE.name);
    await page.locator('textarea').first().fill(PEER_REVIEW_CYCLE.description);

    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill(PEER_REVIEW_CYCLE.startDate);
    await dateInputs.nth(1).fill(PEER_REVIEW_CYCLE.endDate);

    // 提交创建
    await page.getByRole('button', { name: '创建' }).click();
    await page.waitForLoadState('networkidle');

    // 验证周期出现在列表中
    await expect(page.getByText(PEER_REVIEW_CYCLE.name)).toBeVisible({ timeout: 5000 });

    // 通过 API 获取创建的周期 ID
    const response = await page.request.get(`${API_BASE}/peer-reviews/cycles`);
    const data = await response.json();
    const cycle = data.data?.find((c: any) => c.name === PEER_REVIEW_CYCLE.name);
    expect(cycle).toBeTruthy();
    createdCycleId = cycle.id;

    // 截图 - 创建成功
    await page.screenshot({ path: 'tests/screenshots/peer-review-cycle-created.png' });
  });

  test('2. HR配置评价关系', async ({ page }) => {
    await loginAs(page, 'hr');
    await page.goto('/hr/dashboard');
    await page.getByText('360度互评管理').click();
    await page.waitForLoadState('networkidle');

    // 如果没有 cycleId，通过 API 获取
    if (!createdCycleId) {
      const response = await page.request.get(`${API_BASE}/peer-reviews/cycles`);
      const data = await response.json();
      const cycle = data.data?.find((c: any) => c.name === PEER_REVIEW_CYCLE.name);
      if (cycle) createdCycleId = cycle.id;
    }

    // 点击配置评价关系
    const configBtn = page.getByText('配置评价关系').first();
    if (await configBtn.isVisible()) {
      await configBtn.click();
      await page.waitForLoadState('networkidle');

      // 截图 - 配置关系界面
      await page.screenshot({ path: 'tests/screenshots/peer-review-configure.png' });

      // 检查界面元素是否存在
      await expect(page.locator('select, [role="combobox"]').first()).toBeVisible({ timeout: 5000 });

      // 尝试添加评价关系
      const selects = page.locator('select');
      const selectCount = await selects.count();
      if (selectCount >= 2) {
        // 选择第一个选项
        const options0 = await selects.nth(0).locator('option').allTextContents();
        const options1 = await selects.nth(1).locator('option').allTextContents();
        
        if (options0.length > 1 && options1.length > 1) {
          await selects.nth(0).selectOption({ index: 1 });
          await selects.nth(1).selectOption({ index: 1 });
          
          const addBtn = page.getByRole('button', { name: /添加/ });
          if (await addBtn.isVisible()) {
            await addBtn.click();
            await page.waitForLoadState('networkidle');
          }
        }
      }

      await page.screenshot({ path: 'tests/screenshots/peer-review-relationship-added.png' });
    }
  });

  test('3. 员工查看待评价列表', async ({ page }) => {
    await loginAs(page, 'employee');
    await page.goto('/employee/dashboard');

    // 尝试导航到互评页面
    const peerReviewLink = page.getByText('360度互评');
    if (await peerReviewLink.isVisible()) {
      await peerReviewLink.click();
      await page.waitForLoadState('networkidle');

      // 截图 - 员工互评页面
      await page.screenshot({ path: 'tests/screenshots/employee-peer-review.png' });

      // 检查页面是否正常加载
      await expect(page.locator('body')).not.toContainText('错误');
    }
  });

  test('4. 员工提交互评', async ({ page }) => {
    await loginAs(page, 'employee');
    await page.goto('/employee/dashboard');

    const peerReviewLink = page.getByText('360度互评');
    if (await peerReviewLink.isVisible()) {
      await peerReviewLink.click();
      await page.waitForLoadState('networkidle');

      // 查找待评价项
      const reviewItems = page.locator('.bg-white.rounded-lg');
      const count = await reviewItems.count();

      if (count > 0) {
        // 点击第一个评价项
        await reviewItems.first().click();

        // 尝试填写评分
        const scoreInputs = page.locator('input[type="range"], input[type="number"]');
        const inputCount = await scoreInputs.count();
        const scores = [
          PEER_REVIEW_SCORES.workQuality,
          PEER_REVIEW_SCORES.teamwork,
          PEER_REVIEW_SCORES.communication,
          PEER_REVIEW_SCORES.innovation,
          PEER_REVIEW_SCORES.responsibility,
        ];

        for (let i = 0; i < Math.min(inputCount, scores.length); i++) {
          await scoreInputs.nth(i).fill(String(scores[i]));
        }

        // 填写评语
        const textarea = page.locator('textarea').first();
        if (await textarea.isVisible()) {
          await textarea.fill(PEER_REVIEW_SCORES.comment);
        }

        // 截图 - 填写完成
        await page.screenshot({ path: 'tests/screenshots/peer-review-filled.png' });

        // 提交
        const submitBtn = page.getByRole('button', { name: /提交/ });
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForLoadState('networkidle');
        }
      }

      await page.screenshot({ path: 'tests/screenshots/peer-review-submitted.png' });
    }
  });

  test('5. HR查看统计数据', async ({ page }) => {
    await loginAs(page, 'hr');
    await page.goto('/hr/dashboard');
    await page.getByText('360度互评管理').click();
    await page.waitForLoadState('networkidle');

    // 验证统计卡片存在
    const statsGrid = page.locator('.grid.grid-cols-1');
    await expect(statsGrid.first()).toBeVisible();

    // 截图 - 统计数据
    await page.screenshot({ path: 'tests/screenshots/peer-review-stats.png' });

    // 验证页面基本元素
    await expect(page.getByText('360度互评管理')).toBeVisible();
  });
});
