/* CampusSchedule PWA Service Worker（App Shell + 构建产物预缓存）。
   全部路径基于 SW 自身位置（scope）解析，不硬编码根路径 ——
   同一份产物支持根路径与子路径（如 /CampusSchedule/）部署。 */
const CACHE_NAME = 'campusschedule-v2';
const SCOPE_URL = new URL('./', self.location.href);
const APP_SHELL = ['./index.html', './manifest.webmanifest', './icon.svg'];
// 匹配时忽略 Vary（vite preview/sirv 会带 Vary 头，导致同 URL 匹配失败）
const MATCH_OPTIONS = { ignoreVary: true };

function scopeUrl(path) {
  return new URL(path, SCOPE_URL).href;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // 基础 App Shell
      await cache.addAll(APP_SHELL.map((path) => scopeUrl(path)));
      // 构建期生成的产物清单（hashed assets），保证断网 reload 完整可用
      try {
        const response = await fetch(scopeUrl('./sw-precache.json'), { cache: 'no-store' });
        if (response.ok) {
          const entries = await response.json();
          await cache.addAll(entries.map((entry) => scopeUrl(entry)));
        }
      } catch (error) {
        // 清单缺失（如旧版本产物）：保留 App Shell，静态资源走运行时缓存
        console.warn('[CampusSchedule SW] 预缓存清单加载失败:', error);
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }
  // 导航请求：网络优先，离线回退缓存（当前 URL → index.html）
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(request, MATCH_OPTIONS)
            .then((cached) => cached ?? caches.match(scopeUrl('./index.html'), MATCH_OPTIONS)),
        ),
    );
    return;
  }
  // 静态资源：缓存优先，未命中回源并写缓存
  event.respondWith(
    caches.match(request, MATCH_OPTIONS).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        }),
    ),
  );
});
