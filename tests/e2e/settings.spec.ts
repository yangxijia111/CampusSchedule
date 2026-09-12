import { expect, test } from '@playwright/test';
import { loadDemoIfEmpty } from './helpers';

/**
 * Issue #2：设置持久化 E2E。
 * 修改设置 → reload → 设置保持，且 use24Hour / showWeekend 真实影响界面。
 */

test.describe('设置持久化', () => {
  test('修改设置后刷新，设置与界面效果保持', async ({ page }) => {
    await page.goto('./');
    await loadDemoIfEmpty(page);

    await page.goto('./settings');
    // 关闭 24 小时制、开启显示周末
    await page.getByText('24 小时制').locator('..').locator('input[type="checkbox"]').click();
    await page.getByText('显示周末').locator('..').locator('input[type="checkbox"]').click();
    // 提醒分钟数改为 30
    await page.getByLabel('提醒分钟数').fill('30');

    // 刷新后设置保持
    await page.reload();
    const use24HourBox = page.getByText('24 小时制').locator('..').locator('input[type="checkbox"]');
    const weekendBox = page.getByText('显示周末').locator('..').locator('input[type="checkbox"]');
    await expect(use24HourBox).not.toBeChecked();
    await expect(weekendBox).toBeChecked();
    await expect(page.getByLabel('提醒分钟数')).toHaveValue('30');

    // use24Hour=false 生效：周表节次列显示中文 12 小时制
    await page.goto('./');
    await expect(page.locator('.timetable')).toBeVisible();
    await expect(page.locator('.tt-time', { hasText: '上午 8:00' })).toBeVisible();

    // showWeekend=true 生效：周表出现周六列头
    await expect(page.locator('.tt-head', { hasText: '周六' })).toBeVisible();
  });
});
