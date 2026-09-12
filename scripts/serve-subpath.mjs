// E2E 专用：把 apps/web/dist 以子路径（/CampusSchedule/）托管的静态服务器。
// 行为对齐 GitHub Pages：文件存在 → 返回文件；缺失的导航路径 → 404.html；
// 注意它比 Pages 更宽松的地方仅在于这是本地测试替身。
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = fileURLToPath(new URL('../apps/web/dist', import.meta.url));
const MOUNT = '/CampusSchedule';
const PORT = 4174;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
    if (!pathname.startsWith(MOUNT + '/') && pathname !== MOUNT) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('not mounted');
      return;
    }
    let relative = pathname.slice(MOUNT.length) || '/';
    if (relative.endsWith('/')) {
      relative += 'index.html';
    }
    // 防路径穿越：归一化后必须仍在 dist 内
    const filePath = normalize(join(DIST, relative));
    if (!filePath.startsWith(normalize(DIST))) {
      res.writeHead(403);
      res.end();
      return;
    }
    const info = await stat(filePath).catch(() => null);
    if (info?.isFile()) {
      const body = await readFile(filePath);
      res.writeHead(200, {
        'content-type': MIME[extname(filePath)] ?? 'application/octet-stream',
      });
      res.end(body);
      return;
    }
    // SPA 深链接：模仿 GitHub Pages，落到 404.html
    const fallback = await readFile(join(DIST, '404.html'));
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    res.end(fallback);
  } catch {
    res.writeHead(500);
    res.end();
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[serve-subpath] http://127.0.0.1:${PORT}${MOUNT}/ -> ${DIST}`);
});
