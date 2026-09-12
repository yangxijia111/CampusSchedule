import type { CourseSlot, PeriodDefinition, Semester, Weekday } from '@campusschedule/core';
import { dateOfWeek, findPeriodDefinition, weekdayName } from '@campusschedule/core';
import { Link } from 'react-router-dom';
import { courseColorIndex, formatTime, nowMinutes, slotTooltip, timeToMinutes, todayIsoDate, todayWeekday } from '../lib/ui-utils';

interface TimetableGridProps {
  semester: Semester;
  slots: CourseSlot[];
  periodTimes: PeriodDefinition[];
  weekdays: Weekday[];
  week: number;
  /** 是否高亮“今天”所在列（展示周等于当前周时）。 */
  highlightToday: boolean;
  /** 24 小时制显示节次时间。 */
  use24Hour: boolean;
}

/** 同一 (星期, 节次区间) 的多个 Session 并排渲染，冲突不丢弃。 */
function groupSlots(slots: CourseSlot[]): Map<string, CourseSlot[]> {
  const groups = new Map<string, CourseSlot[]>();
  for (const slot of slots) {
    const key = slot.session.weekday + ':' + slot.session.startPeriod + '-' + slot.session.endPeriod;
    const list = groups.get(key);
    if (list) {
      list.push(slot);
    } else {
      groups.set(key, [slot]);
    }
  }
  return groups;
}

export function TimetableGrid({
  semester,
  slots,
  periodTimes,
  weekdays,
  week,
  highlightToday,
  use24Hour,
}: TimetableGridProps) {
  const maxPeriod = slots.reduce((max, s) => Math.max(max, s.session.endPeriod), 0);
  const rows = Math.max(maxPeriod, periodTimes.length);
  const todayWeek = todayWeekday();

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `56px repeat(${weekdays.length}, minmax(96px, 1fr))`,
    gridTemplateRows: `40px repeat(${rows}, minmax(56px, auto))`,
  };

  const groups = groupSlots(slots);
  const today = todayIsoDate();
  const minutes = nowMinutes();

  return (
    <div className="timetable-wrap">
      <div className="timetable" style={gridStyle}>
        {/* 表头行 */}
        <div className="tt-head" style={{ gridColumn: 1, gridRow: 1 }}>
          节次
        </div>
        {weekdays.map((weekday, index) => {
          const dateText = semester.startDate ? dateOfWeek(semester, week, weekday) : null;
          const isToday = highlightToday && weekday === todayWeek && dateText === today;
          return (
            <div
              key={weekday}
              className={'tt-head' + (isToday ? ' today-col' : '')}
              style={{ gridColumn: index + 2, gridRow: 1 }}
            >
              {weekdayName(weekday)}
              {dateText && <span className="date">{dateText.slice(5)}</span>}
            </div>
          );
        })}

        {/* 节次行 */}
        {Array.from({ length: rows }, (_, i) => i + 1).map((period) => {
          const def = findPeriodDefinition(periodTimes, period);
          return (
            <div key={'p' + period} className="tt-time" style={{ gridColumn: 1, gridRow: period + 1 }}>
              <span className="period-no">{period}</span>
              {def && (
                <>
                  <span>{formatTime(def.startTime, use24Hour)}</span>
                  <span>{formatTime(def.endTime, use24Hour)}</span>
                </>
              )}
            </div>
          );
        })}

        {/* 课程块 */}
        {[...groups.entries()].map(([key, group]) => {
          const [weekdayText, rangeText] = key.split(':');
          const [startText, endText] = rangeText!.split('-');
          const weekday = Number(weekdayText) as Weekday;
          const startPeriod = Number(startText);
          const endPeriod = Number(endText);
          const columnIndex = weekdays.indexOf(weekday);
          if (columnIndex < 0) return null;

          const startDef = findPeriodDefinition(periodTimes, startPeriod);
          const endDef = findPeriodDefinition(periodTimes, endPeriod);
          const isToday = highlightToday && weekday === todayWeek;
          const isPast =
            isToday && endDef !== null && timeToMinutes(endDef.endTime) <= minutes;

          return (
            <div
              key={key}
              className="tt-cell"
              style={{
                gridColumn: columnIndex + 2,
                gridRow: startPeriod + 1 + ' / ' + (endPeriod + 2),
                borderTop: startPeriod === 1 ? 'none' : undefined,
              }}
            >
              <div className="course-stack">
                {group.map((slot) => (
                  <Link
                    key={slot.session.id}
                    to={'/course/' + slot.course.id}
                    className={
                      'course-block cb-' +
                      courseColorIndex(slot.course.id) +
                      (group.length > 1 ? ' conflict' : '') +
                      (isPast ? ' past' : '')
                    }
                    title={slotTooltip(slot)}
                  >
                    <span className="name">
                      {slot.course.name}
                      {group.length > 1 ? ' ⚠' : ''}
                    </span>
                    {slot.session.location && (
                      <span className="meta">{slot.session.location}</span>
                    )}
                    {startDef && endDef && (
                      <span className="meta">
                        {formatTime(startDef.startTime, use24Hour)}-{formatTime(endDef.endTime, use24Hour)}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
