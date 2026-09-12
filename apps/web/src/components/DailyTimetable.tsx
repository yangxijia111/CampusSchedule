import { Link } from 'react-router-dom';
import type { Weekday } from '@campusschedule/core';
import {
  findPeriodDefinition,
  sessionsForDay,
  weekOfDate,
  weekdayName,
} from '@campusschedule/core';
import {
  useActiveCourses,
  useActivePeriodTimes,
  useActiveSemester,
  useAppStore,
} from '../store/use-app-store';
import { courseColorIndex, formatTime, nowMinutes, timeToMinutes } from '../lib/ui-utils';

interface DailyTimetableProps {
  /** 展示今天还是明天（影响状态标记与日期计算）。 */
  target: 'today' | 'tomorrow';
}

/** 日期加一天的本地 ISO 日期与星期。 */
function nextDay(now: Date): { iso: string; weekday: Weekday } {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const day = date.getDay();
  return { iso: toIso(date), weekday: (day === 0 ? 7 : day) as Weekday };
}

function toIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return date.getFullYear() + '-' + month + '-' + day;
}

/**
 * 移动端当日课程纵向时间轴：今天 / 明天。
 * 状态标记（正在上课 / 已结束 / 下一节）仅对"今天"计算。
 */
export function DailyTimetable({ target }: DailyTimetableProps) {
  const semester = useActiveSemester();
  const courses = useActiveCourses();
  const periodTimes = useActivePeriodTimes();
  const use24Hour = useAppStore((s) => s.settings.use24Hour);

  if (!semester) return null;

  const now = new Date();
  const isToday = target === 'today';
  const { iso, weekday } = isToday
    ? { iso: toIso(now), weekday: (now.getDay() === 0 ? 7 : now.getDay()) as Weekday }
    : nextDay(now);

  const week = semester.startDate ? weekOfDate(semester, iso) : 1;
  const slots = sessionsForDay(courses, week, weekday).sort(
    (a, b) => a.session.startPeriod - b.session.startPeriod,
  );

  const minutes = nowMinutes();
  let nextMarked = false;

  return (
    <div className="card daily-list" data-testid="daily-list">
      <h2 className="daily-heading">
        {weekdayName(weekday)}
        <span className="muted">
          {' '}
          · 第 {week} 周 · {iso.slice(5)}
        </span>
      </h2>
      {slots.length === 0 ? (
        <p className="muted">{isToday ? '今天没有课 🎉' : '明天没有课 🎉'}</p>
      ) : (
        slots.map(({ course, session }) => {
          const startDef = findPeriodDefinition(periodTimes, session.startPeriod);
          const endDef = findPeriodDefinition(periodTimes, session.endPeriod);
          const start = startDef ? timeToMinutes(startDef.startTime) : null;
          const end = endDef ? timeToMinutes(endDef.endTime) : null;
          let statusClass = '';
          let statusText = '';
          if (isToday && start !== null && end !== null) {
            if (start <= minutes && minutes < end) {
              statusClass = ' ongoing';
              statusText = '正在上课';
            } else if (end <= minutes) {
              statusClass = ' past';
              statusText = '已结束';
            } else if (!nextMarked) {
              nextMarked = true;
              statusClass = ' next';
              statusText = '下一节';
            }
          }
          return (
            <Link
              key={session.id}
              to={'/course/' + course.id}
              className={'daily-item cb-' + courseColorIndex(course.id) + statusClass}
            >
              <div className="daily-time">
                {startDef
                  ? formatTime(startDef.startTime, use24Hour)
                  : '第' + session.startPeriod + '节'}
                <span className="muted">
                  {endDef ? formatTime(endDef.endTime, use24Hour) : '第' + session.endPeriod + '节'}
                </span>
              </div>
              <div className="daily-main">
                <span className="name">{course.name}</span>
                <span className="meta">
                  {session.location ?? '地点待定'}
                  {(session.teacherNames ?? course.teacherNames).length > 0
                    ? ' · ' + (session.teacherNames ?? course.teacherNames).join('、')
                    : ''}
                </span>
              </div>
              {statusText && <span className="daily-status">{statusText}</span>}
            </Link>
          );
        })
      )}
    </div>
  );
}
