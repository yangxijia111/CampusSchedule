import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// 开发/构建时直接消费各包源码，避免先构建 dist
const packageNames = ['core', 'adapters', 'storage', 'importer-protocol'];

/**
 * 生成 SW 预缓存清单（sw-precache.json）：列出 dist 全部产物（相对 ./ 路径）。
 * SW 安装时读取该清单并 cache.addAll —— 同一份构建产物在根路径与子路径
 * 部署下都能完整离线（清单内路径由 SW 按 scope 解析）。
 */
function pwaPrecachePlugin(): Plugin {
  return {
    name: 'campusschedule-pwa-precache',
    apply: 'build',
    closeBundle() {
      const outDir = fileURLToPath(new URL('./dist', import.meta.url));
      const entries = readdirSync(outDir, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) =>
          relative(outDir, join(entry.parentPath ?? '', entry.name)).replaceAll('\\', '/'),
        )
        .filter(
          (entry) =>
            entry !== 'sw.js' && entry !== '404.html' && entry !== 'sw-precache.json',
        )
        .map((entry) => './' + entry);
      writeFileSync(
        join(outDir, 'sw-precache.json'),
        JSON.stringify(entries, null, 1),
        'utf-8',
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), pwaPrecachePlugin()],
  // 相对 base：同一份 dist 可部署在根路径与任意子路径（如 GitHub Pages /repo/）
  base: './',
  resolve: {
    alias: Object.fromEntries(
      packageNames.map((name) => [
        `@campusschedule/${name}`,
        fileURLToPath(new URL(`../../packages/${name}/src/index.ts`, import.meta.url)),
      ]),
    ),
  },
});
