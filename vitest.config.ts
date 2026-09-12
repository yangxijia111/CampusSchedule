import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Vitest 直接消费各包源码（src），避免测试前必须先构建 dist
const packageNames = ['core', 'adapters', 'storage', 'importer-protocol'];

const alias = Object.fromEntries(
  packageNames.map((name) => [
    `@campusschedule/${name}`,
    fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url)),
  ]),
);

export default defineConfig({
  resolve: { alias },
  test: {
    include: ['packages/**/src/**/*.test.ts', 'apps/**/src/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
