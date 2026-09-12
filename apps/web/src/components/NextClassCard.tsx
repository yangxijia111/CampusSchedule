import { findPeriodDefinition, weekdayName } from '@campusschedule/core';
import { Link } from 'react-router-dom';
import { useAppStore, useActiveCourses, useActivePeriodTimes, useCurrentWeek } from '../store/use-app-store';
import { courseColorIndex, formatTime, nowMinutes, timeToMinutes, todayWeekday } from '../lib/ui-utils';

/** 今日概览卡片：正在上课 / 下一节课 / 今日已结束。 */
export function NextClassCard() {
  const courses = useActiveCourses();
  const periodTimes = useActivePeriodTimes();
  const currentWeek = useCurrentWeek();
  const use24Hour = useAppStore((s) => s.settings.use24Hour);
  const weekday = todayWeekday();

  const slots = courses
    .flatMap((course) => course.sessions.map((session) => ({ course, session })))
    .filter((slot) => slot.session.weekday === weekday && slot.session.weeks.includes(currentWeek))
    .sort((a, b) => a.session.startPeriod - b.session.startPeriod);

  if (slots.length === 0) {
    return (
      <div className="card">
        <h2>今日（{weekdayName(weekday)}）</h2>
        <p className="muted">今天没有课 🎉</p>
      </div>
    );
  }

  const minutes = nowMinutes();
  const withTime = slots
    .map((slot) => {
      const startDef = findPeriodDefinition(periodTimes, slot.session.startPeriod);
      const endDef = findPeriodDefinition(periodTimes, slot.session.endPeriod);
      return {
        slot,
        start: startDef ? timeToMinutes(startDef.startTime) : null,
        end: endDef ? timeToMinutes(endDef.endTime) : null,
      };
    })
    .filter((item): item is typeof item & { start: number; end: number } =>
      item.start !== null && item.end !== null,
    );

  if (withTime.length === 0) {
    return (
      <div className="card next-class">
        <h2>今日共 {slots.length} 节课</h2>
        <p className="muted">未配置作息时间，无法计算"下一节课"。可在设置中补充节次时间。</p>
      </div>
    );
  }

  const ongoing = withTime.find((item) => item.start <= minutes && minutes < item.end);
  const next = withTime.find((item) => item.start > minutes);
  const finished = withTime[withTime.length - 1]!.end <= minutes;

  const target = ongoing ?? next;
  const minutesUntil = target ? target.start - minutes : 0;
  const startDef = findPeriodDefinition(periodTimes, target?.slot.session.startPeriod ?? 1);
  const endDef = findPeriodDefinition(periodTimes, target?.slot.session.endPeriod ?? 1);

  return (
    <div className={'card next-class' + (ongoing ? ' ongoing' : '')}>
      <h2>今日（{weekdayName(weekday)}）共 {slots.length} 节课</h2>
      {target ? (
        <div>
          <span className="status">
            {ongoing ? '正在上课' : finished ? '' : `${minutesUntil} 分钟后上课`}
          </span>
          {!ongoing && !finished && <span className="status"> · 下一节</span>}
          {finished && <span className="status">今日课程已结束，本节为最后一节</span>}
          <div style={{ marginTop: 6, fontSize: 15, fontWeight: 600 }}>
            {target.slot.course.name}
          </div>
          <div className="muted">
            {startDef && endDef
              ? formatTime(startDef.startTime, use24Hour) + '-' + formatTime(endDef.endTime, use24Hour)
              : ''}
            {target.slot.session.location ? ' · ' + target.slot.session.location : ''}
            {(target.slot.session.teacherNames ?? target.slot.course.teacherNames).length > 0
              ? ' · ' + (target.slot.session.teacherNames ?? target.slot.course.teacherNames).join('、')
              : ''}
          </div>
          <Link
            to={'/course/' + target.slot.course.id}
            className={'course-block cb-' + courseColorIndex(target.slot.course.id)}
            style={{ marginTop: 8, maxWidth: 220 }}
          >
            查看课程详情
          </Link>
        </div>
      ) : (
        <p className="muted">今天的课已全部结束 🎓</p>
      )}
    </div>
  );
}
