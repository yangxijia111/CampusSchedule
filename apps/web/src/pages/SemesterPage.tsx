import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/use-app-store';

const TERM_NAMES: Record<number, string> = { 1: '第一学期', 2: '第二学期', 3: '短学期' };

export function SemesterPage() {
  const semesters = useAppStore((s) => s.semesters);
  const coursesBySemester = useAppStore((s) => s.coursesBySemester);
  const activeSemesterId = useAppStore((s) => s.activeSemesterId);
  const deleteSemesterData = useAppStore((s) => s.deleteSemesterData);
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
              <div style={{ display: 'flex', gap: 8 }}>
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
          真实数据来源：学校教务系统导入时自动带入；也可在导入后手动修正。
        </p>
      </div>
    </div>
  );
}
