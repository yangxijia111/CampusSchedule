import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    trace: 'off',
  },
  // 根路径（vite preview）+ 子路径（模拟 GitHub Pages /CampusSchedule/）
  webServer: [
    {
      command:
        'pnpm --filter @campusschedule/web build && pnpm --filter @campusschedule/web preview --host 127.0.0.1 --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173/',
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: 'node scripts/serve-subpath.mjs',
      url: 'http://127.0.0.1:4174/CampusSchedule/',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4173/' },
    },
    {
      name: 'chromium-subpath',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://127.0.0.1:4174/CampusSchedule/' },
    },
  ],
});
