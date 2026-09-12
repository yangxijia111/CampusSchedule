import { useAppStore, useCurrentWeek, useDisplayWeek, useTotalWeeks } from '../store/use-app-store';

export function WeekSwitcher() {
  const displayWeek = useDisplayWeek();
  const currentWeek = useCurrentWeek();
  const totalWeeks = useTotalWeeks();
  const selectedWeek = useAppStore((s) => s.selectedWeek);
  const setSelectedWeek = useAppStore((s) => s.setSelectedWeek);

  const isCurrent = selectedWeek === null || selectedWeek === currentWeek;

  return (
    <div className="week-switcher">
      <div className="group">
        <button
          className="btn"
          onClick={() => setSelectedWeek(Math.max(1, displayWeek - 1))}
          disabled={displayWeek <= 1}
          aria-label="上一周"
        >
          ←
        </button>
        <span className={'week-label' + (isCurrent ? ' is-current' : '')}>
          第 {displayWeek} 周
          {isCurrent && currentWeek > 0 ? '（本周）' : ''}
        </span>
        <button
          className="btn"
          onClick={() => setSelectedWeek(Math.min(totalWeeks, displayWeek + 1))}
          disabled={displayWeek >= totalWeeks}
          aria-label="下一周"
        >
          →
        </button>
      </div>
      <div className="group">
        <select
          value={displayWeek}
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
          aria-label="选择周次"
        >
          {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => (
            <option key={week} value={week}>
              第 {week} 周
            </option>
          ))}
        </select>
        {selectedWeek !== null && (
          <button className="btn" onClick={() => setSelectedWeek(null)}>
            回到本周
          </button>
        )}
      </div>
    </div>
  );
}
