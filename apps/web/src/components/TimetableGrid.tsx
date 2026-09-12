import type { CourseSlot, PeriodDefinition, Semester, Weekday } from '@campusschedule/core';
import { dateOfWeek, findPeriodDefinition, weekdayName } from '@campusschedule/core';
import { Link } from 'react-router-dom';
import { courseColorIndex, formatTime, nowMinutes, slotTooltip, timeToMinutes, todayIsoDate, todayWeekday } from '../lib/ui-utils';
import { layoutSlots } from '../lib/slot-layout';

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

/**
 * 周课表网格：外层 CSS grid 定位表头 / 节次列 / 星期列；
 * 每个星期列内部用 interval layout（lib/slot-layout）做并发列分配，
 * 课程块按百分比绝对定位 —— 完全重叠并排、部分重叠错列，不丢弃任何课程。
 */
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
    // 等高行（1fr）：星期列内课程块按百分比定位才能与节次网格线对齐
    gridTemplateRows: `40px repeat(${rows}, minmax(56px, 1fr))`,
  };

  // interval layout：按星期分组并分配并发列
  const layouts = layoutSlots(slots);
  const layoutByWeekday = new Map(layouts.map((layout) => [layout.weekday, layout]));

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

        {/* 课程块：每个星期一个占满全部节次行的容器，内部按布局绝对定位 */}
        {weekdays.map((weekday, columnIndex) => {
          const layout = layoutByWeekday.get(weekday);
          const isToday = highlightToday && weekday === todayWeek;
          if (!layout) {
            return (
              <div
                key={'day-' + weekday}
                className={'tt-day' + (isToday ? ' today-col' : '')}
                style={{
                  gridColumn: columnIndex + 2,
                  gridRow: '2 / ' + (rows + 2),
                  ['--tt-rows' as string]: String(rows),
                }}
              />
            );
          }
          return (
            <div
              key={'day-' + weekday}
              className={'tt-day' + (isToday ? ' today-col' : '')}
              style={{
                gridColumn: columnIndex + 2,
                gridRow: '2 / ' + (rows + 2),
                // CSS 变量：背景横向节次网格线的行高
                ['--tt-rows' as string]: String(rows),
              }}
            >
              {layout.entries.map(({ slot, columnIndex: col, columnCount }) => {
                const { session } = slot;
                const startDef = findPeriodDefinition(periodTimes, session.startPeriod);
                const endDef = findPeriodDefinition(periodTimes, session.endPeriod);
                const isPast =
                  isToday && endDef !== null && timeToMinutes(endDef.endTime) <= minutes;
                // 百分比几何：纵向按节次；横向在并发组内按列均分
                // （组与组垂直不重叠，各自从 0% 起横向划分，完全重叠并排、部分重叠错列）
                const top = ((session.startPeriod - 1) / rows) * 100;
                const height = ((session.endPeriod - session.startPeriod + 1) / rows) * 100;
                const left = (col / columnCount) * 100;
                const width = 100 / columnCount;
                return (
                  <Link
                    key={session.id}
                    to={'/course/' + slot.course.id}
                    data-testid="course-block"
                    className={
                      'course-block cb-' +
                      courseColorIndex(slot.course.id) +
                      (columnCount > 1 ? ' conflict' : '') +
                      (isPast ? ' past' : '')
                    }
                    style={{
                      position: 'absolute',
                      top: top + '%',
                      height: 'calc(' + height + '% - 4px)',
                      left: left + '%',
                      width: 'calc(' + width + '% - 4px)',
                    }}
                    title={slotTooltip(slot)}
                  >
                    <span className="name">
                      {slot.course.name}
                      {columnCount > 1 ? ' ⚠' : ''}
                    </span>
                    {session.location && <span className="meta">{session.location}</span>}
                    {startDef && endDef && (
                      <span className="meta">
                        {formatTime(startDef.startTime, use24Hour)}-{formatTime(endDef.endTime, use24Hour)}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
