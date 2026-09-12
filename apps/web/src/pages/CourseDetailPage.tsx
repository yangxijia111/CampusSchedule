import type { Course } from '@campusschedule/core';
import { formatWeeksText, weekdayName } from '@campusschedule/core';
import { Link, useParams } from 'react-router-dom';
import { useAppStore } from '../store/use-app-store';

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const semesters = useAppStore((s) => s.semesters);
  const coursesBySemester = useAppStore((s) => s.coursesBySemester);
  const settings = useAppStore((s) => s.settings);

  let course: Course | null = null;
  for (const list of Object.values(coursesBySemester)) {
    const found = list.find((c) => c.id === courseId);
    if (found) {
      course = found;
      break;
    }
  }

  if (!course) {
    return (
      <div className="card empty-state">
        <p>未找到该课程。</p>
        <Link to="/" className="btn">
          返回课表
        </Link>
      </div>
    );
  }

  const semester = semesters.find((s) => s.id === course!.semesterId);

  return (
    <div>
      <div className="card">
        <h2>{course.name}</h2>
        <div className="detail-grid">
          <div className="detail-item">
            <span className="label">课程代码</span>
            <div className="value">{course.courseCode ?? '—'}</div>
          </div>
          <div className="detail-item">
            <span className="label">教师</span>
            <div className="value">{course.teacherNames.join('、') || '—'}</div>
          </div>
          <div className="detail-item">
            <span className="label">学分</span>
            <div className="value">{course.credit ?? '—'}</div>
          </div>
          <div className="detail-item">
            <span className="label">课程性质</span>
            <div className="value">{course.category ?? '—'}</div>
          </div>
          <div className="detail-item">
            <span className="label">所属学期</span>
            <div className="value">{semester?.displayName ?? course.semesterId}</div>
          </div>
          <div className="detail-item">
            <span className="label">上课提醒</span>
            <div className="value">提前 {settings.reminderMinutes} 分钟</div>
          </div>
        </div>
        {course.note && <p className="note">备注：{course.note}</p>}
      </div>

      <div className="card">
        <h2>上课时间（{course.sessions.length} 个时段）</h2>
        {course.sessions.map((session) => (
          <div key={session.id} className="session-row">
            <span className="tag">{weekdayName(session.weekday)}</span>
            <span>
              第 {session.startPeriod}-{session.endPeriod} 节
            </span>
            <span className="tag">{formatWeeksText(session.weeks)}</span>
            {session.location ? (
              <span>{session.location}</span>
            ) : (
              <span className="tag warn">地点缺失</span>
            )}
          </div>
        ))}
      </div>

      <Link to="/" className="btn">
        ← 返回课表
      </Link>
    </div>
  );
}
