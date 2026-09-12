// 扩展打包：apps/extension/dist → dist/extension/campusschedule-importer.zip
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const extDist = path.join(rootDir, 'apps', 'extension', 'dist');
const outDir = path.join(rootDir, 'dist', 'extension');
const zipPath = path.join(outDir, 'campusschedule-importer.zip');

if (!existsSync(extDist)) {
  console.error('未找到 apps/extension/dist，请先运行 pnpm build');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

// Windows 用 PowerShell，其他平台用 zip
if (process.platform === 'win32') {
  execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-Command',
      `Compress-Archive -Path "${path.join(extDist, '*')}" -DestinationPath "${zipPath}" -Force`,
    ],
    { stdio: 'inherit' },
  );
} else {
  execFileSync('zip', ['-r', '-j', zipPath, '.'], { cwd: extDist, stdio: 'inherit' });
}

console.log('[package-extension] 已生成', zipPath);
