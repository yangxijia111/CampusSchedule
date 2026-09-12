// 扩展构建脚本：esbuild 打包 TS 入口 + 复制静态文件到 dist/
import * as esbuild from 'esbuild';
import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(rootDir, 'dist');

await mkdir(distDir, { recursive: true });

// 三个入口：content script（IIFE，MV3 限制）、service worker 与 popup（ESM）
await esbuild.build({
  entryPoints: {
    content: path.join(rootDir, 'src/content/content-script.ts'),
    background: path.join(rootDir, 'src/background/service-worker.ts'),
    popup: path.join(rootDir, 'src/popup/popup.ts'),
  },
  outdir: distDir,
  bundle: true,
  minify: false,
  sourcemap: false,
  format: 'esm',
  target: ['chrome110'],
  logLevel: 'info',
  outExtension: { '.js': '.js' },
});

// content script 改写为 classic script（MV3 content script 不支持模块）
// esbuild ESM 单入口 bundle 后无 import 语句，可直接作为 classic script 使用。

// 复制静态文件：manifest.json 与 popup.html
await copyFile(path.join(rootDir, 'manifest.json'), path.join(distDir, 'manifest.json'));
await copyFile(path.join(rootDir, 'src/popup/popup.html'), path.join(distDir, 'popup.html'));

// 安全自检：dist/manifest.json 不得包含 <all_urls> 与 cookies 权限
const manifestText = await import('node:fs/promises').then((fs) =>
  fs.readFile(path.join(distDir, 'manifest.json'), 'utf8'),
);
const manifest = JSON.parse(manifestText);
const patterns = [
  ...(manifest.host_permissions ?? []),
  ...(manifest.content_scripts ?? []).flatMap((cs) => cs.matches ?? []),
];
for (const pattern of patterns) {
  if (pattern.includes('<all_urls>')) {
    throw new Error('安全检查失败：manifest 包含 <all_urls>');
  }
}
if ((manifest.permissions ?? []).includes('cookies')) {
  throw new Error('安全检查失败：manifest 申请了 cookies 权限');
}

console.log(
  '[build] dist 文件：',
  (await readdir(distDir)).join(', '),
);
