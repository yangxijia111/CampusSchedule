import { useState } from 'react';
import type { Weekday } from '@campusschedule/core';
import {
  buildIcsCalendar,
  findConflicts,
  icsFileName,
  sessionsForWeek,
} from '@campusschedule/core';
import { DailyTimetable } from '../components/DailyTimetable';
import { EmptyState } from '../components/EmptyState';
import { NextClassCard } from '../components/NextClassCard';
import { TimetableGrid } from '../components/TimetableGrid';
import { WeekSwitcher } from '../components/WeekSwitcher';
import { useAppStore } from '../store/use-app-store';
import {
  useActiveCourses,
  useActivePeriodTimes,
  useActiveSemester,
  useActiveSemesterIsMock,
  useCurrentWeek,
  useDisplayWeek,
  useTotalWeeks,
} from '../store/use-app-store';
import { todayIsoDate } from '../lib/ui-utils';

/** 移动端视图：今日 / 明日纵向时间轴为主，完整周表按需查看。 */
type MobileTab = 'today' | 'tomorrow' | 'week';

export function TodayPage() {
  const [mobileTab, setMobileTab] = useState<MobileTab>('today');
  const semester = useActiveSemester();
  const courses = useActiveCourses();
  const periodTimes = useActivePeriodTimes();
  const displayWeek = useDisplayWeek();
  const currentWeek = useCurrentWeek();
  const totalWeeks = useTotalWeeks();
  const settings = useAppStore((s) => s.settings);
  const isMock = useActiveSemesterIsMock();
  const semesters = useAppStore((s) => s.semesters);
  const activeSemesterId = useAppStore((s) => s.activeSemesterId);
  const setActiveSemester = useAppStore((s) => s.setActiveSemester);

  if (!semester) {
    return <EmptyState />;
  }

  const allWeekdays: Weekday[] =
    settings.weekStart === 7 ? [7, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 7];
  const weekdays = settings.showWeekend ? allWeekdays : allWeekdays.filter((d) => d <= 5);

  const slots = sessionsForWeek(courses, displayWeek);
  const conflicts = findConflicts(courses, displayWeek);

  function exportIcs(): void {
    const result = buildIcsCalendar({
      semester: semester!,
      courses,
      periodTimes,
      alarmMinutes: settings.reminderMinutes,
    });
    if (!result.ok || !result.ics) {
      window.alert('导出失败：' + (result.error ?? '未知错误'));
      return;
    }
    const blob = new Blob([result.ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = icsFileName(semester!);
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="today-header">
        <span className="today-badge">今天是 {todayIsoDate()}</span>
        {semesters.length > 1 && (
          <select
            value={activeSemesterId}
            onChange={(e) => void setActiveSemester(e.target.value)}
            aria-label="切换学期"
            title="切换当前学期"
          >
            {semesters.map((item) => (
              <option key={item.id} value={item.id}>
                {item.displayName}
              </option>
            ))}
          </select>
        )}
        <span className="muted">
          {semesters.length > 1
            ? '第 ' + displayWeek + ' 周'
            : semester.displayName + ' · 第 ' + displayWeek + ' 周'}
          {currentWeek > 0 ? ' / 共 ' + totalWeeks + ' 周' : ''}
        </span>
        <button className="btn" onClick={exportIcs} style={{ marginLeft: 'auto' }}>
          📅 导出日历 (ICS)
        </button>
      </div>

      <NextClassCard />

      {/* 移动端视图切换（桌面隐藏）：今天 | 明天 | 本周 */}
      <div className="mobile-tabs" role="tablist" aria-label="课表视图">
        {(
          [
            { key: 'today', label: '今天' },
            { key: 'tomorrow', label: '明天' },
            { key: 'week', label: '本周' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={mobileTab === tab.key}
            className={'mobile-tab' + (mobileTab === tab.key ? ' active' : '')}
            onClick={() => setMobileTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 移动端当日纵向时间轴 */}
      {mobileTab !== 'week' && (
        <div className="daily-view">
          <DailyTimetable target={mobileTab} />
        </div>
      )}

      {/* 完整周视图：桌面始终可见；移动端切到"本周"时可见 */}
      <div className={'week-view' + (mobileTab === 'week' ? ' mobile-show-week' : '')}>
        <WeekSwitcher />

        {conflicts.length > 0 && (
          <div className="card" style={{ borderColor: 'var(--warning)', background: '#fffbeb' }}>
            <strong style={{ color: 'var(--warning)' }}>
              ⚠ 第 {displayWeek} 周有 {conflicts.length} 处时间冲突
            </strong>
            <p className="muted" style={{ margin: '6px 0 0' }}>
              {conflicts
                .slice(0, 3)
                .map(
                  (group) =>
                    group.slots.map((s) => s.course.name).join(' 与 ') +
                    '（星期' +
                    group.weekday +
                    ' 第' +
                    group.startPeriod +
                    '-' +
                    group.endPeriod +
                    '节）',
                )
                .join('；')}
              {conflicts.length > 3 ? ' 等' : ''}
              。两个课程均已保留，请自行核对。
            </p>
          </div>
        )}

        {slots.length === 0 ? (
          <div className="card empty-state">
            <p>第 {displayWeek} 周没有课程。</p>
          </div>
        ) : (
          <TimetableGrid
            semester={semester}
            slots={slots}
            periodTimes={periodTimes}
            weekdays={weekdays}
            week={displayWeek}
            highlightToday={displayWeek === currentWeek}
            use24Hour={settings.use24Hour}
          />
        )}
      </div>

      {isMock && <p className="note">当前为示例课表数据。导入真实课表后此处将显示你的个人课表。</p>}
    </div>
  );
}
