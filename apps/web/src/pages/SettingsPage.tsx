import { useState } from 'react';
import { exportBackup } from '@campusschedule/storage';
import { useAppStore } from '../store/use-app-store';
import { getRepository } from '../lib/storage';

export function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [confirmClear, setConfirmClear] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  async function handleExport(): Promise<void> {
    try {
      const backup = await exportBackup(getRepository());
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'campusschedule-backup.json';
      anchor.click();
      URL.revokeObjectURL(url);
      setStatusMessage('备份文件已下载。');
    } catch (error) {
      setStatusMessage('导出失败：' + (error instanceof Error ? error.message : String(error)));
    }
  }

  async function handleClearAll(): Promise<void> {
    const repo = getRepository();
    await repo.clearAll();
    setStatusMessage('本地数据已清除，即将刷新…');
    setTimeout(() => window.location.reload(), 800);
  }

  return (
    <div>
      <div className="card">
        <h2>课表设置</h2>
        <div className="settings-row">
          <div>
            上课前提醒
            <span className="hint">用于 ICS 日历提醒与站内提醒（开发中）</span>
          </div>
          <input
            type="number"
            min={0}
            max={120}
            step={5}
            value={settings.reminderMinutes}
            onChange={(e) => updateSettings({ reminderMinutes: Number(e.target.value) })}
            aria-label="提醒分钟数"
          />
        </div>
        <div className="settings-row">
          <div>显示周末</div>
          <input
            type="checkbox"
            checked={settings.showWeekend}
            onChange={(e) => updateSettings({ showWeekend: e.target.checked })}
          />
        </div>
        <div className="settings-row">
          <div>24 小时制</div>
          <input
            type="checkbox"
            checked={settings.use24Hour}
            onChange={(e) => updateSettings({ use24Hour: e.target.checked })}
          />
        </div>
        <div className="settings-row">
          <div>每周起始日</div>
          <select
            value={settings.weekStart}
            onChange={(e) => updateSettings({ weekStart: Number(e.target.value) as 1 | 7 })}
          >
            <option value={1}>周一</option>
            <option value={7}>周日</option>
          </select>
        </div>
      </div>

      <div className="card">
        <h2>数据</h2>
        <div className="settings-row">
          <div>
            导出全部数据
            <span className="hint">备份为 JSON 文件（含全部学期、课程与设置）</span>
          </div>
          <button className="btn" onClick={() => void handleExport()}>
            导出
          </button>
        </div>
        <div className="settings-row">
          <div>
            清除全部本地数据
            <span className="hint">删除所有学期与课表，不可恢复</span>
          </div>
          {confirmClear ? (
            <>
              <button className="btn danger" onClick={() => void handleClearAll()}>
                确认清空
              </button>
              <button className="btn" onClick={() => setConfirmClear(false)}>
                取消
              </button>
            </>
          ) : (
            <button className="btn danger" onClick={() => setConfirmClear(true)}>
              清除
            </button>
          )}
        </div>
        {statusMessage && <p className="note">{statusMessage}</p>}
      </div>

      <div className="card">
        <h2>关于</h2>
        <p className="muted">
          CampusSchedule 校园课表助手 — 非学校官方应用。数据仅保存在本地浏览器中。
        </p>
      </div>
    </div>
  );
}
