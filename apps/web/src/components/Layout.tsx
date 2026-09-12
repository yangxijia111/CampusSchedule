import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', label: '课表' },
  { to: '/semester', label: '学期' },
  { to: '/import', label: '导入' },
  { to: '/settings', label: '设置' },
];

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function Layout({ children }: { children: ReactNode }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-title">📚 CampusSchedule</h1>
        <nav className="app-nav" aria-label="主导航">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              {({ isActive }) => (
                <span className={isActive ? 'active' : undefined}>{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </header>
      {installPrompt && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>把 CampusSchedule 安装到桌面，离线也能查看课表。</span>
          <button
            className="btn primary"
            style={{ marginLeft: 'auto' }}
            onClick={() => {
              void installPrompt.prompt().then(() => setInstallPrompt(null));
            }}
          >
            安装应用
          </button>
        </div>
      )}
      {children}
      <footer style={{ marginTop: 32, fontSize: 12, color: 'var(--text-secondary)' }}>
        <p>CampusSchedule · 非学校官方应用 · 数据仅保存在本地浏览器</p>
      </footer>
    </div>
  );
}
