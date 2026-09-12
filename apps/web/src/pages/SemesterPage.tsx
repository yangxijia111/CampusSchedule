import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Semester } from '@campusschedule/core';
import { useAppStore } from '../store/use-app-store';

const TERM_NAMES: Record<number, string> = { 1: '第一学期', 2: '第二学期', 3: '短学期' };

/** 单个学期的校历编辑器（开学日期 / 总周数）。 */
function CalendarEditor({ semester }: { semester: Semester }) {
  const updateSemesterCalendar = useAppStore((s) => s.updateSemesterCalendar);
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(semester.startDate ?? '');
  const [totalWeeks, setTotalWeeks] = useState(String(semester.totalWeeks ?? 20));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave(): Promise<void> {
    setError('');
    setSaving(true);
    try {
      await updateSemesterCalendar(semester.id, {
        startDate: startDate.trim() === '' ? undefined : startDate.trim(),
        totalWeeks: totalWeeks.trim() === '' ? undefined : Number(totalWeeks),
      });
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button className="btn" onClick={() => setOpen(true)}>
        修改校历
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
      <label style={{ fontSize: 12 }}>
        第一教学周周一
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          aria-label={semester.displayName + ' 开学日期'}
          style={{ marginLeft: 8 }}
        />
      </label>
      <label style={{ fontSize: 12 }}>
        总周数
        <input
          type="number"
          min={1}
          max={60}
          value={totalWeeks}
          onChange={(e) => setTotalWeeks(e.target.value)}
          aria-label={semester.displayName + ' 总周数'}
          style={{ marginLeft: 8, width: 64 }}
        />
      </label>
      {error && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</span>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn primary" disabled={saving} onClick={() => void handleSave()}>
          {saving ? '保存中…' : '保存'}
        </button>
        <button className="btn" onClick={() => setOpen(false)}>
          取消
        </button>
      </div>
    </div>
  );
}

export function SemesterPage() {
  const semesters = useAppStore((s) => s.semesters);
  const coursesBySemester = useAppStore((s) => s.coursesBySemester);
  const activeSemesterId = useAppStore((s) => s.activeSemesterId);
  const deleteSemesterData = useAppStore((s) => s.deleteSemesterData);
  const setActiveSemester = useAppStore((s) => s.setActiveSemester);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  return (
    <div>
      <div className="card">
        <h2>学期管理</h2>
        {semesters.length === 0 && (
          <p className="muted">暂无学期数据。到首页导入课表或体验示例课表。</p>
        )}
        {semesters.map((semester) => {
          const courses = coursesBySemester[semester.id] ?? [];
          const isActive = semester.id === activeSemesterId;
          return (
            <div key={semester.id} className="semester-item">
              <div>
                <div style={{ fontWeight: 600 }}>
                  {semester.displayName}
                  {isActive && <span className="tag" style={{ marginLeft: 8 }}>当前</span>}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {semester.academicYear} {TERM_NAMES[semester.term] ?? `第 ${semester.term} 学期`}
                  {' · '}
                  {semester.startDate ? `开学 ${semester.startDate}` : '开学日期未配置'}
                  {semester.totalWeeks ? ` · 共 ${semester.totalWeeks} 周` : ''}
                  {' · '}
                  {courses.length} 门课程
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {!isActive && (
                  <button
                    className="btn primary"
                    onClick={() => void setActiveSemester(semester.id)}
                  >
                    设为当前
                  </button>
                )}
                <CalendarEditor semester={semester} />
                <Link to="/import" className="btn">
                  重新导入
                </Link>
                {confirmingId === semester.id ? (
                  <>
                    <button
                      className="btn danger"
                      onClick={() => {
                        deleteSemesterData(semester.id);
                        setConfirmingId(null);
                      }}
                    >
                      确认删除
                    </button>
                    <button className="btn" onClick={() => setConfirmingId(null)}>
                      取消
                    </button>
                  </>
                ) : (
                  <button
                    className="btn danger"
                    onClick={() => setConfirmingId(semester.id)}
                    title="删除后可在首页重新导入或体验示例课表"
                  >
                    删除
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h2>校历信息</h2>
        <p className="muted">
          学期第一教学周起始日期与总周数用于计算"当前教学周"和导出日历。
          真实数据来源：学校教务系统导入时自动带入；导入后如与实际不符，可点击"修改校历"手动修正。
        </p>
      </div>
    </div>
  );
}
