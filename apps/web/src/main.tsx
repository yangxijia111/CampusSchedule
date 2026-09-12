import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAppStore } from './store/use-app-store';
import './styles.css';

/**
 * 应用部署基路径：从当前构建产物的 URL 推导（assets/xxx.js → 应用根目录）。
 * 相对 base（'./'）构建下，根路径部署得到 '/'，子路径部署（如 GitHub Pages
 * /CampusSchedule/）得到 '/CampusSchedule/'——同一份产物两种部署都正确。
 */
const APP_BASE_URL = new URL('../', import.meta.url);
const APP_BASENAME = APP_BASE_URL.pathname;

// GitHub Pages 等静态主机不支持 SPA 深链接时，404.html 会重定向到
// 应用根 + ?p=/原始路径；这里还原浏览器地址（进路由前执行）。
{
  const params = new URLSearchParams(window.location.search);
  const restored = params.get('p');
  if (restored && restored.startsWith('/')) {
    window.history.replaceState(
      {},
      '',
      APP_BASENAME.replace(/\/$/, '') + restored + window.location.hash,
    );
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('找不到 #root 挂载点');
}

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <ErrorBoundary>
      <HydratedRouter />
    </ErrorBoundary>
  </StrictMode>,
);

/** 先从 IndexedDB 恢复数据，再渲染应用（刷新页面数据不丢失）。 */
function HydratedRouter() {
  const hydrated = useAppStore((s) => s.hydrated);

  if (!hydrated) {
    void useAppStore.getState().hydrate();
    return <div className="empty-state">正在加载本地数据…</div>;
  }

  return (
    <BrowserRouter basename={APP_BASENAME}>
      <App />
    </BrowserRouter>
  );
}

// PWA Service Worker：仅生产环境注册；路径相对应用根（根/子路径部署通用）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(new URL('sw.js', APP_BASE_URL).href)
      .catch((error) => {
        console.warn('[CampusSchedule] Service Worker 注册失败:', error);
      });
  });
}
