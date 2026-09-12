import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exportBackup, validateBackup } from '@campusschedule/storage';
import type { BackupSummary } from '@campusschedule/storage';
import type { PeriodDefinition } from '@campusschedule/core';
import { useAppStore } from '../store/use-app-store';
import { useActivePeriodTimes, useActiveSemester } from '../store/use-app-store';
import { getRepository } from '../lib/storage';

/**
 * 作息时间编辑器：编辑当前学期各节次的上下课时间。
 * 导入的作息可直接修改后保存（periodTimes:<semesterId>）。
 */
function PeriodTimesEditor() {
  const semester = useActiveSemester();
  const periodTimes = useActivePeriodTimes();
  const savePeriodTimes = useAppStore((s) => s.savePeriodTimes);
  const [draft, setDraft] = useState<PeriodDefinition[] | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  // 未开始编辑时跟随 store（切学期后自动同步）
  const rows = draft ?? [...periodTimes].sort((a, b) => a.period - b.period);

  if (!semester) {
    return <p className="muted">还没有学期数据，先到首页导入课表或体验示例课表。</p>;
  }

  function update(index: number, field: 'startTime' | 'endTime', value: string): void {
    setSavedMessage('');
    setDraft(rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function addRow(): void {
    setSavedMessage('');
    const nextPeriod = (rows[rows.length - 1]?.period ?? 0) + 1;
    setDraft([...rows, { period: nextPeriod, startTime: '08:00', endTime: '08:45' }]);
  }

  function removeRow(index: number): void {
    setSavedMessage('');
    const filtered = rows.filter((_, i) => i !== index);
    // 删除后重排节次号，保持 1..N 连续
    setDraft(filtered.map((row, i) => ({ ...row, period: i + 1 })));
  }

  async function handleSave(): Promise<void> {
    setError('');
    setSaving(true);
    try {
      await savePeriodTimes(semester.id, rows);
      setDraft(null);
      setSavedMessage('作息时间已保存。');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {rows.length === 0 && (
        <p className="muted">当前学期还没有作息时间。请按学校作息添加各节次上下课时间。</p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((row, index) => (
          <div key={row.period} className="settings-row" style={{ padding: 0 }}>
            <div>第 {row.period} 节</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="time"
                value={row.startTime}
                onChange={(e) => update(index, 'startTime', e.target.value)}
                aria-label={'第 ' + row.period + ' 节开始时间'}
              />
              <span>—</span>
              <input
                type="time"
                value={row.endTime}
                onChange={(e) => update(index, 'endTime', e.target.value)}
                aria-label={'第 ' + row.period + ' 节结束时间'}
              />
              <button className="btn" onClick={() => removeRow(index)} aria-label={'删除第 ' + row.period + ' 节'}>
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <button className="btn" onClick={addRow}>
          添加节次
        </button>
        <button className="btn primary" disabled={saving || rows.length === 0} onClick={() => void handleSave()}>
          {saving ? '保存中…' : '保存作息时间'}
        </button>
        {draft !== null && (
          <button
            className="btn"
            onClick={() => {
              setDraft(null);
              setError('');
            }}
          >
            放弃修改
          </button>
        )}
      </div>
      {error && <p style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</p>}
      {savedMessage && <p className="note">{savedMessage}</p>}
    </div>
  );
}

/**
 * 从备份恢复：先深度校验并展示摘要，用户二次确认后事务式恢复。
 * 校验失败不触碰本地数据；恢复中禁止重复操作。
 */
function RestoreBackupSection() {
  const restoreBackup = useAppStore((s) => s.restoreBackup);
  const [pending, setPending] = useState<BackupSummary | null>(null);
  const [error, setError] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [doneSummary, setDoneSummary] = useState<BackupSummary | null>(null);
  const [parsedBackup, setParsedBackup] = useState<unknown>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File): Promise<void> {
    setError('');
    setPending(null);
    setDoneSummary(null);
    let json: unknown;
    try {
      json = JSON.parse(await file.text());
    } catch {
      setError('备份文件不是合法的 JSON，无法恢复。');
      return;
    }
    const result = validateBackup(json);
    if (!result.ok) {
      setError('备份校验失败：' + result.error);
      return;
    }
    setParsedBackup(json);
    setPending(result.summary);
  }

  async function handleRestore(): Promise<void> {
    if (pending === null) return;
    setRestoring(true);
    setError('');
    try {
      const summary = await restoreBackup(parsedBackup);
      setDoneSummary(summary);
      setPending(null);
    } catch (cause) {
      setError('恢复失败：' + (cause instanceof Error ? cause.message : String(cause)));
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        aria-label="选择备份文件"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void handleFile(file);
          }
        }}
      />
      {pending && (
        <div className="card" style={{ borderColor: 'var(--warning)', background: '#fffbeb', marginTop: 12, marginBottom: 0 }}>
          <strong>确认恢复这份备份？</strong>
          <p className="muted" style={{ margin: '6px 0' }}>
            包含 {pending.semesterCount} 个学期 · {pending.courseCount} 门课程 · {pending.sessionCount} 个上课时段
            {pending.exportedAt ? '（导出于 ' + new Date(pending.exportedAt).toLocaleString('zh-CN') + '）' : ''}
          </p>
          <p className="muted" style={{ margin: '0 0 8px' }}>
            恢复会<strong>覆盖当前全部本地数据</strong>，建议先导出一份当前数据备份。
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn danger" disabled={restoring} onClick={() => void handleRestore()}>
              {restoring ? '恢复中…' : '确认恢复'}
            </button>
            <button
              className="btn"
              disabled={restoring}
              onClick={() => {
                setPending(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}
      {doneSummary && (
        <p className="note" role="status">
          ✅ 已恢复 {doneSummary.semesterCount} 个学期、{doneSummary.courseCount} 门课程。
        </p>
      )}
      {error && (
        <p style={{ color: 'var(--danger)', marginTop: 8 }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const clearAllData = useAppStore((s) => s.clearAllData);
  const [confirmClear, setConfirmClear] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const navigate = useNavigate();

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
    try {
      await clearAllData();
      // 清空后回到首页空状态（不再自动恢复示例数据）
      navigate('/');
    } catch (error) {
      setStatusMessage(
        '清除失败：' + (error instanceof Error ? error.message : String(error)),
      );
    }
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
        <h2>作息时间（当前学期）</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          各节次的上下课时间，用于"下一节课"提醒、课表时间显示与日历导出。
          学校导入的作息可直接在此修改。
        </p>
        <PeriodTimesEditor />
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
        <div className="settings-row" style={{ marginTop: 12 }}>
          <div>
            从备份恢复
            <span className="hint">选择此前导出的备份 JSON，校验通过后整体恢复</span>
          </div>
        </div>
        <RestoreBackupSection />
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
