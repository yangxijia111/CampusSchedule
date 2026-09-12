import { expect, test } from '@playwright/test';

/**
 * Issue #6：部分节次冲突不叠压 E2E。
 * 导入含 1-2 vs 2-3、三门课冲突的 fixture，断言课程块包围盒互不相交。
 */

test.describe('冲突课程布局', () => {
  test('部分重叠课程错列显示，包围盒互不相交', async ({ page }) => {
    await page.goto('/import');
    await page.setInputFiles(
      'input[type="file"]',
      'tests/e2e/fixtures/e2e-overlap.campusschedule.json',
    );
    await page.getByRole('button', { name: '确认导入' }).click();
    await expect(page.getByText('重叠课A').first()).toBeVisible({ timeout: 10_000 });

    const blocks = page.getByTestId('course-block');
    await expect(blocks).toHaveCount(6, { timeout: 5_000 });

    // 收集所有课程块的包围盒
    const boxes = await blocks.evaluateAll((nodes) =>
      nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          text: (node.textContent ?? '').trim(),
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
        };
      }),
    );
    expect(boxes).toHaveLength(6);

    // 任意两个课程块的包围盒不得相交（允许 1px 容差）
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i]!;
        const b = boxes[j]!;
        const overlaps =
          a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
        expect(overlaps, `「${a.text}」与「${b.text}」不应空间叠压`).toBe(false);
      }
    }

    // 冲突横幅仍工作（1-2 vs 2-3 与 三门冲突 两组）
    await expect(page.getByText(/时间冲突/)).toBeVisible();

    // 冲突课程仍可点击进入详情（注意避开冲突横幅中的同名文本）
    await page
      .locator('[data-testid="course-block"]', { hasText: '重叠课B' })
      .first()
      .click();
    await expect(page.getByText('上课时间', { exact: false })).toBeVisible();
  });
});
