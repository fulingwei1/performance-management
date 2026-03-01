import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/login';
import { cleanupTestData } from '../helpers/cleanup';
import { INTERVIEW_PLAN, INTERVIEW_RECORD, IMPROVEMENT_PLAN } from '../fixtures/test-data';

test.describe('绩效面谈完整流程', () => {
  test.afterAll(async ({ request }) => {
    await cleanupTestData(request);
  });

  test('1. 经理创建面谈计划', async ({ page }) => {
    await loginAs(page, 'manager');
    await page.goto('/manager/dashboard');

    // 导航到面谈计划
    await page.getByText('面谈计划').click();
    await page.waitForLoadState('networkidle');

    // 截图 - 面谈计划页面
    await page.screenshot({ path: 'tests/screenshots/interview-plans.png' });

    // 创建面谈计划
    await page.getByText('创建面谈计划').click();

    // 填写标题
    const titleInput = page.locator('input[type="text"]').first();
    await titleInput.fill(INTERVIEW_PLAN.title);

    // 填写说明
    const textarea = page.locator('textarea').first();
    if (await textarea.isVisible()) {
      await textarea.fill(INTERVIEW_PLAN.description);
    }

    // 选择日期
    const dateInput = page.locator('input[type="date"]').first();
    if (await dateInput.isVisible()) {
      await dateInput.fill(INTERVIEW_PLAN.scheduledDate);
    }

    // 选择员工（如果有下拉框）
    const employeeSelect = page.locator('select').first();
    if (await employeeSelect.isVisible()) {
      const options = await employeeSelect.locator('option').count();
      if (options > 1) {
        await employeeSelect.selectOption({ index: 1 });
      }
    }

    // 截图 - 表单填写完成
    await page.screenshot({ path: 'tests/screenshots/interview-plan-form.png' });

    // 提交
    const submitBtn = page.getByRole('button', { name: /创建|保存/ });
    await submitBtn.click();
    await page.waitForLoadState('networkidle');

    // 验证计划出现在列表
    await expect(page.getByText(INTERVIEW_PLAN.title)).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'tests/screenshots/interview-plan-created.png' });
  });

  test('2. 经理创建面谈记录', async ({ page }) => {
    await loginAs(page, 'manager');
    await page.goto('/manager/dashboard');

    // 导航到面谈记录
    await page.getByText('面谈记录').click();
    await page.waitForLoadState('networkidle');

    // 截图 - 面谈记录页面
    await page.screenshot({ path: 'tests/screenshots/interview-records.png' });

    // 创建新记录
    const createBtn = page.getByText(/创建面谈记录|新建记录|创建记录/);
    if (await createBtn.isVisible()) {
      await createBtn.click();

      const textareas = page.locator('textarea');
      const count = await textareas.count();

      if (count >= 1) await textareas.nth(0).fill(INTERVIEW_RECORD.summary);
      if (count >= 2) await textareas.nth(1).fill(INTERVIEW_RECORD.achievements);
      if (count >= 3) await textareas.nth(2).fill(INTERVIEW_RECORD.improvements);
      if (count >= 4) await textareas.nth(3).fill(INTERVIEW_RECORD.nextSteps);

      // 选择关联的面谈计划（如果有）
      const planSelect = page.locator('select');
      if (await planSelect.first().isVisible()) {
        const options = await planSelect.first().locator('option').count();
        if (options > 1) {
          await planSelect.first().selectOption({ index: 1 });
        }
      }

      await page.screenshot({ path: 'tests/screenshots/interview-record-form.png' });

      const saveBtn = page.getByRole('button', { name: /保存|提交/ });
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForLoadState('networkidle');
      }
    }

    await page.screenshot({ path: 'tests/screenshots/interview-record-created.png' });
  });

  test('3. 经理创建改进计划', async ({ page }) => {
    await loginAs(page, 'manager');
    await page.goto('/manager/dashboard');

    // 导航到面谈记录或改进计划
    const improvementLink = page.getByText(/改进计划|面谈记录/);
    await improvementLink.first().click();
    await page.waitForLoadState('networkidle');

    // 查找创建改进计划入口
    const createImprovement = page.getByText(/创建改进|新建改进|改进计划/);
    if (await createImprovement.first().isVisible()) {
      await createImprovement.first().click();

      // 填写改进计划
      const titleInput = page.locator('input[type="text"]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill(IMPROVEMENT_PLAN.title);
      }

      const textarea = page.locator('textarea').first();
      if (await textarea.isVisible()) {
        await textarea.fill(IMPROVEMENT_PLAN.description);
      }

      const dateInput = page.locator('input[type="date"]').first();
      if (await dateInput.isVisible()) {
        await dateInput.fill(IMPROVEMENT_PLAN.targetDate);
      }

      await page.screenshot({ path: 'tests/screenshots/improvement-plan-form.png' });

      const saveBtn = page.getByRole('button', { name: /保存|创建/ });
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForLoadState('networkidle');
      }
    }

    await page.screenshot({ path: 'tests/screenshots/improvement-plan-created.png' });
  });

  test('4. 经理更新改进进度', async ({ page }) => {
    await loginAs(page, 'manager');
    await page.goto('/manager/dashboard');

    const recordLink = page.getByText(/面谈记录|改进计划/);
    await recordLink.first().click();
    await page.waitForLoadState('networkidle');

    // 查找更新进度入口
    const updateBtn = page.getByText(/更新进度|更新|编辑/);
    if (await updateBtn.first().isVisible()) {
      await updateBtn.first().click();

      const textarea = page.locator('textarea').first();
      if (await textarea.isVisible()) {
        await textarea.fill('进度更新：已完成PMP培训课程的70%，开始独立管理小型项目。');
      }

      await page.screenshot({ path: 'tests/screenshots/progress-update-form.png' });

      const saveBtn = page.getByRole('button', { name: /保存|更新/ });
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForLoadState('networkidle');
      }
    }

    await page.screenshot({ path: 'tests/screenshots/progress-updated.png' });
  });

  test('5. 查看面谈历史', async ({ page }) => {
    await loginAs(page, 'manager');
    await page.goto('/manager/dashboard');

    // 导航到面谈记录
    await page.getByText('面谈记录').click();
    await page.waitForLoadState('networkidle');

    // 验证页面加载正常
    await expect(page.getByText('面谈记录')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('错误');

    // 截图 - 面谈历史
    await page.screenshot({ path: 'tests/screenshots/interview-history.png' });
  });
});
