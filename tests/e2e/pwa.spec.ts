import { expect, test } from '@playwright/test';
import { loadDemoIfEmpty } from './helpers';

/**
 * Issue #7：PWA 与子路径部署 E2E。
 * 子路径深链接（404.html 回退 → ?p= 还原）与真正离线启动（SW 预缓存 + IndexedDB）。
 */

test.describe('PWA 与子路径部署', () => {
  test('子路径深链接直达路由（404 回退还原应用路由）', async ({ page, baseURL }) => {
    test.skip(!baseURL?.includes('4174'), '仅子路径部署项目运行');

    // 直达 /CampusSchedule/semester：静态服务器（模拟 Pages）返回 404.html，
    // 由其重定向回应用根并携带 ?p=/semester，应用还原路由
    await page.goto('./semester');
    await expect(page.getByText('学期管理')).toBeVisible({ timeout: 15_000 });
    // 还原后的地址应回到子路径下的干净路由
    await expect(page).toHaveURL(/\/CampusSchedule\/semester$/);
  });

  test('首次加载后断网 reload，应用仍能启动并显示课表', async ({ page, context }) => {
    await page.goto('./');

    // 清理可能存在的旧版本 Service Worker / 缓存（preview 服务器与浏览器跨运行复用）
    await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    });

    // 干净环境下重新加载：安装当前版本 SW 并写入预缓存
    await page.reload();
    await loadDemoIfEmpty(page);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(async () => {
      const keys = await caches.keys();
      if (!keys.some((key) => key.startsWith('campusschedule-'))) return false;
      const cache = await caches.open(keys.find((k) => k.startsWith('campusschedule-'))!);
      const urls = (await cache.keys()).map((request) => new URL(request.url).pathname);
      // 预缓存清单写入完成：index.html + hashed assets 都在
      return urls.includes('/index.html') || urls.includes('/CampusSchedule/index.html');
    });

    await context.setOffline(true);
    try {
      await page.reload();
      // 离线启动：应用渲染且 IndexedDB 中的课表仍在
      const mainContent =
        (page.viewportSize()?.width ?? 1280) < 768
          ? page.getByTestId('daily-list')
          : page.locator('.timetable');
      await expect(mainContent).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole('heading', { name: '📚 CampusSchedule' })).toBeVisible();
    } finally {
      await context.setOffline(false);
    }
  });
});
