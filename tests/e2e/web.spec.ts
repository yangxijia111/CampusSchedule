import { expect, test } from '@playwright/test';
import { loadDemoIfEmpty } from './helpers';

/**
 * Web 端 E2E（07 测试计划 §4）：
 * 空状态 → 显式体验示例 → 周课表 → 切换周 → 课程详情 → 导入 Fixture → 数据持久 → 清空语义。
 */

test.describe('CampusSchedule Web', () => {
  test('首次进入显示空状态，点击体验示例后加载课表', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/CampusSchedule/);
    // 空状态：不自动写入示例数据
    await expect(page.getByRole('heading', { name: '还没有课表' })).toBeVisible();
    await expect(page.getByRole('link', { name: '导入学校课表' })).toBeVisible();

    // 用户显式点击后才加载示例
    await page.getByRole('button', { name: '体验示例课表' }).click();
    await expect(page.getByRole('heading', { name: '📚 CampusSchedule' })).toBeVisible();
    await expect(page.locator('.week-label')).toContainText(/第 \d+ 周/);
    await expect(page.getByText('高等数学').first()).toBeVisible();
    // 示例数据来源提示可见
    await expect(page.getByText('当前为示例课表数据')).toBeVisible();
  });

  test('切换教学周', async ({ page }) => {
    await page.goto('/');
    await loadDemoIfEmpty(page);
    const weekLabel = page.locator('.week-label');
    const initial = await weekLabel.textContent();

    await page.getByRole('button', { name: '下一周' }).click();
    await expect(weekLabel).not.toHaveText(initial ?? '');

    await page.getByRole('button', { name: '上一周' }).click();
    await expect(weekLabel).toHaveText(initial ?? '');
  });

  test('打开课程详情并返回', async ({ page }) => {
    await page.goto('/');
    await loadDemoIfEmpty(page);
    await page.getByText('高等数学').first().click();
    await expect(page.getByText('上课时间', { exact: false })).toBeVisible();
    await expect(page.getByText(/1-16周/).first()).toBeVisible();
    await page.getByRole('link', { name: '← 返回课表' }).click();
    await expect(page.locator('.timetable')).toBeVisible();
  });

  test('导入 Fixture JSON：预览 → 确认 → 进入新课表 → 刷新持久且无示例提示', async ({ page }) => {
    await page.goto('/');
    await loadDemoIfEmpty(page);

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

    // 真实导入数据不得显示示例数据提示
    await expect(page.getByText('当前为示例课表数据')).toHaveCount(0);

    // 刷新后数据仍在（IndexedDB 持久化）
    await page.reload();
    await expect(page.getByText('E2E高等数学').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('当前为示例课表数据')).toHaveCount(0);
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

  test('清空全部数据后刷新，保持空状态（不自动恢复示例）', async ({ page }) => {
    await page.goto('/');
    await loadDemoIfEmpty(page);

    await page.goto('/settings');
    await page.getByRole('button', { name: '清除' }).click();
    await page.getByRole('button', { name: '确认清空' }).click();

    // 清空后回首页空状态
    await expect(page.getByRole('heading', { name: '还没有课表' })).toBeVisible({
      timeout: 10_000,
    });

    // 刷新后仍为空状态，示例数据不复活
    await page.reload();
    await expect(page.getByRole('heading', { name: '还没有课表' })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('高等数学')).toHaveCount(0);
  });

  test('学期管理页显示学期列表', async ({ page }) => {
    await page.goto('/');
    await loadDemoIfEmpty(page);

    await page.goto('/semester');
    await expect(page.getByText('学期管理')).toBeVisible();
    await expect(page.getByText(/示例|E2E 测试学期/).first()).toBeVisible();
  });
});
