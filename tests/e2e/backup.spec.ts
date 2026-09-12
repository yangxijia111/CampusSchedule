import { expect, test } from '@playwright/test';
import { loadDemoIfEmpty } from './helpers';

/**
 * Issue #5：备份恢复 E2E。
 * 导出备份 → 清空全部数据 → 从备份恢复 → 数据完整回来。
 */

test.describe('备份与恢复', () => {
  test('导出 → 清空 → 恢复闭环，数据完整恢复', async ({ page }) => {
    await page.goto('./');
    await loadDemoIfEmpty(page);

    // 1. 导出备份
    await page.goto('./settings');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '导出', exact: true }).click(),
    ]);
    const backupPath = 'test-results/backup-e2e/campusschedule-backup.json';
    await download.saveAs(backupPath);

    // 2. 清空全部数据（回到空状态）
    await page.getByRole('button', { name: '清除', exact: true }).click();
    await page.getByRole('button', { name: '确认清空' }).click();
    await expect(page.getByRole('heading', { name: '还没有课表' })).toBeVisible({
      timeout: 10_000,
    });

    // 3. 从备份恢复
    await page.goto('./settings');
    await page.setInputFiles('input[type="file"]', backupPath);
    await expect(page.getByText('确认恢复这份备份？')).toBeVisible();
    await expect(page.getByText(/1 个学期 · 8 门课程/)).toBeVisible();
    await page.getByRole('button', { name: '确认恢复' }).click();

    // 4. 数据完整回来
    await expect(page.getByRole('status')).toContainText('已恢复 1 个学期、8 门课程');
    await page.goto('./');
    await expect(page.getByText('高等数学').first()).toBeVisible({ timeout: 10_000 });
    // 示例数据标记（isMock 导入记录）随备份恢复，提示重新出现
    await expect(page.getByText('当前为示例课表数据')).toBeVisible();
  });

  test('损坏的备份文件被拒绝且数据不变', async ({ page }) => {
    await page.goto('./');
    await loadDemoIfEmpty(page);

    await page.goto('./settings');
    await page.setInputFiles('input[type="file"]', {
      name: 'broken-backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ format: 'campusschedule-backup', version: 99, data: {} })),
    });
    await expect(page.getByRole('alert')).toContainText('版本不兼容');

    // 本地数据未被破坏
    await page.goto('./');
    await expect(page.getByText('高等数学').first()).toBeVisible();
  });

  test('非 JSON 文件给出人话错误', async ({ page }) => {
    await page.goto('./settings');
    await page.setInputFiles('input[type="file"]', {
      name: 'bad.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not json at all'),
    });
    await expect(page.getByRole('alert')).toContainText('不是合法的 JSON');
  });
});
