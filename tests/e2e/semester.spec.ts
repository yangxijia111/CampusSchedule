import { expect, test } from '@playwright/test';
import { loadDemoIfEmpty } from './helpers';

/**
 * Issue #5：多学期与编辑能力 E2E。
 * 学期切换 → reload 保持；校历编辑 → 持久；作息时间编辑 → 持久并生效。
 */

test.describe('学期切换与编辑', () => {
  test('导入第二个学期后可切换，刷新后当前学期保持', async ({ page }) => {
    await page.goto('./');
    await loadDemoIfEmpty(page);

    // 导入 fixture，形成两个学期（当前 = E2E 测试学期）
    await page.goto('./import');
    await page.setInputFiles(
      'input[type="file"]',
      'tests/e2e/fixtures/e2e-sample.campusschedule.json',
    );
    await page.getByRole('button', { name: '确认导入' }).click();
    await page.getByRole('button', { name: '查看课表' }).click();

    // 首页出现学期切换下拉，当前值为新导入学期（option 元素不可见，用取值断言）
    const switcher = page.getByLabel('切换学期');
    await expect(switcher).toBeVisible({ timeout: 10_000 });
    await expect(switcher).toHaveValue('e2e-2026-2027-1');
    await switcher.selectOption({ label: '2026-2027 学年 第一学期（示例数据）' });
    await expect(page.getByText('高等数学').first()).toBeVisible();

    // 刷新后当前学期保持
    await page.reload();
    await expect(page.getByText('高等数学').first()).toBeVisible({ timeout: 10_000 });
    await expect(switcher).toHaveValue(/mock-2026-2027-1/);
  });

  test('修改校历（开学日期）后保存并持久', async ({ page }) => {
    await page.goto('./');
    await loadDemoIfEmpty(page);

    await page.goto('./semester');
    await page.getByRole('button', { name: '修改校历' }).click();
    const dateInput = page.getByLabel(/开学日期/);
    await dateInput.fill('2026-09-01');
    await page.getByRole('button', { name: '保存' }).click();

    // 保存后列表显示新开学日期
    await expect(page.getByText('开学 2026-09-01')).toBeVisible();
    // 刷新后仍保持
    await page.reload();
    await expect(page.getByText('开学 2026-09-01')).toBeVisible();
  });

  test('修改校历输入非法周数被拒绝', async ({ page }) => {
    await page.goto('./');
    await loadDemoIfEmpty(page);

    await page.goto('./semester');
    await page.getByRole('button', { name: '修改校历' }).click();
    const weeksInput = page.getByLabel(/总周数/);
    await weeksInput.fill('99');
    await page.getByRole('button', { name: '保存' }).click();
    await expect(page.getByText(/小于等于 60|最大为 60|不得超过 60|too_big|总周数/).first()).toBeVisible();
  });

  test('编辑作息时间后保存，周表与刷新均生效', async ({ page }) => {
    await page.goto('./');
    await loadDemoIfEmpty(page);

    await page.goto('./settings');
    const firstStart = page.getByLabel('第 1 节开始时间');
    await firstStart.fill('07:30');
    await page.getByRole('button', { name: '保存作息时间' }).click();
    await expect(page.getByText('作息时间已保存。')).toBeVisible();

    // 周表节次列显示新时间
    await page.goto('./');
    await expect(page.locator('.tt-time', { hasText: '07:30' })).toBeVisible();

    // 刷新后仍保持
    await page.reload();
    await expect(page.locator('.tt-time', { hasText: '07:30' })).toBeVisible();
  });
});
