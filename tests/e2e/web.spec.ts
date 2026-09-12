import { expect, test } from '@playwright/test';

/**
 * Web 端 E2E（07 测试计划 §4）：
 * 导入 Fixture JSON → 显示学期 → 周课表 → 切换周 → 课程详情 → 数据持久。
 */

test.describe('CampusSchedule Web', () => {
  test('首页加载示例课表并显示当前周', async ({ page }) => {
    await page.goto('/');
    // 首次使用自动 seed 示例课表
    await expect(page).toHaveTitle(/CampusSchedule/);
    await expect(page.getByRole('heading', { name: '📚 CampusSchedule' })).toBeVisible();
    await expect(page.locator('.week-label')).toContainText(/第 \d+ 周/);
    await expect(page.getByText('高等数学').first()).toBeVisible();
  });

  test('切换教学周', async ({ page }) => {
    await page.goto('/');
    const weekLabel = page.locator('.week-label');
    const initial = await weekLabel.textContent();

    await page.getByRole('button', { name: '下一周' }).click();
    await expect(weekLabel).not.toHaveText(initial ?? '');

    await page.getByRole('button', { name: '上一周' }).click();
    await expect(weekLabel).toHaveText(initial ?? '');
  });

  test('打开课程详情并返回', async ({ page }) => {
    await page.goto('/');
    await page.getByText('高等数学').first().click();
    await expect(page.getByText('上课时间', { exact: false })).toBeVisible();
    await expect(page.getByText(/1-16周/).first()).toBeVisible();
    await page.getByRole('link', { name: '← 返回课表' }).click();
    await expect(page.locator('.timetable')).toBeVisible();
  });

  test('导入 Fixture JSON：预览 → 确认 → 进入新课表 → 刷新持久', async ({ page }) => {
    await page.goto('/import');
    await page.setInputFiles(
      'input[type="file"]',
      'tests/e2e/fixtures/e2e-sample.campusschedule.json',
    );

    // 预览信息
    await expect(page.getByText('导入预览')).toBeVisible();
    await expect(page.getByText('E2E 测试学期')).toBeVisible();
    await expect(page.getByText('2 门')).toBeVisible();
    await expect(page.getByText(/解析警告/)).toBeVisible();

    // 确认导入
    await page.getByRole('button', { name: '确认导入' }).click();
    await expect(page.getByText('导入成功')).toBeVisible({ timeout: 10_000 });

    // 自动跳转回课表，显示新学期
    await expect(page.getByText('E2E 测试学期')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('E2E高等数学').first()).toBeVisible();

    // 刷新后数据仍在（IndexedDB 持久化）
    await page.reload();
    await expect(page.getByText('E2E高等数学').first()).toBeVisible({ timeout: 10_000 });
  });

  test('非法文件被拒绝且给出原因', async ({ page }) => {
    await page.goto('/import');
    await page.setInputFiles('input[type="file"]', {
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"hello": 1}'),
    });
    await expect(page.getByText('导入失败')).toBeVisible();
    await expect(page.getByText(/校验失败/)).toBeVisible();
  });

  test('学期管理页显示学期列表', async ({ page }) => {
    await page.goto('/semester');
    await expect(page.getByText('学期管理')).toBeVisible();
    await expect(page.getByText(/示例|E2E 测试学期/).first()).toBeVisible();
  });
});
