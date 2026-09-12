import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAppStore } from './store/use-app-store';
import './styles.css';

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
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

// PWA Service Worker：仅生产环境注册
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[CampusSchedule] Service Worker 注册失败:', error);
    });
  });
}
