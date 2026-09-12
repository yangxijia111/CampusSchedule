import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/use-app-store';

/**
 * 空状态引导：没有任何学期数据时显示。
 * 示例数据必须由用户显式点击加载（清空全部数据后回到这里，不自动恢复）。
 */
export function EmptyState() {
  const loadDemoTimetable = useAppStore((s) => s.loadDemoTimetable);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [error, setError] = useState('');

  async function handleLoadDemo(): Promise<void> {
    setLoadingDemo(true);
    setError('');
    try {
      await loadDemoTimetable();
    } catch (cause) {
      setError('示例课表加载失败：' + (cause instanceof Error ? cause.message : String(cause)));
    } finally {
      setLoadingDemo(false);
    }
  }

  return (
    <div className="card empty-state">
      <h2>还没有课表</h2>
      <p className="muted">导入你的学校课表，或先体验一下应用的样子。</p>
      <div className="empty-actions">
        <Link className="btn primary" to="/import">
          导入学校课表
        </Link>
        <button
          className="btn"
          onClick={() => void handleLoadDemo()}
          disabled={loadingDemo}
        >
          {loadingDemo ? '加载中…' : '体验示例课表'}
        </button>
      </div>
      <p className="hint">数据只保存在你自己的设备上。</p>
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}
