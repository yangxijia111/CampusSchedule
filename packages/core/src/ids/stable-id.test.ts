import { describe, expect, it } from 'vitest';
import { courseIdFor, sessionIdFor, stableId } from './stable-id';

describe('stableId', () => {
  it('相同输入得到相同 ID', () => {
    expect(stableId('a', 1, 'b')).toBe(stableId('a', 1, 'b'));
  });
  it('不同输入得到不同 ID', () => {
    expect(stableId('a', 1)).not.toBe(stableId('a', 2));
    expect(stableId('a', 1)).not.toBe(stableId('1', 'a'));
  });
  it('输出为 16 位 hex', () => {
    expect(stableId('x')).toMatch(/^[0-9a-f]{16}$/);
  });
  it('字段顺序敏感', () => {
    expect(stableId('a', 'b')).not.toBe(stableId('b', 'a'));
  });
});

describe('courseIdFor', () => {
  it('业务字段相同 → 课程 ID 相同（跨导入幂等）', () => {
    const input = {
      schoolId: 'gdipu',
      semesterId: 'sem-1',
      normalizedCourseName: '高等数学',
      courseCode: 'MATH101',
    };
    expect(courseIdFor(input)).toBe(courseIdFor({ ...input }));
  });
  it('课程代码不同 → ID 不同', () => {
    const base = {
      schoolId: 'gdipu',
      semesterId: 'sem-1',
      normalizedCourseName: '高等数学',
    };
    expect(courseIdFor({ ...base, courseCode: 'A' })).not.toBe(courseIdFor({ ...base, courseCode: 'B' }));
  });
  it('学期不同 → ID 不同', () => {
    const a = courseIdFor({
      schoolId: 'gdipu',
      semesterId: 'sem-1',
      normalizedCourseName: '高等数学',
    });
    const b = courseIdFor({
      schoolId: 'gdipu',
      semesterId: 'sem-2',
      normalizedCourseName: '高等数学',
    });
    expect(a).not.toBe(b);
  });
});

describe('sessionIdFor', () => {
  const base = {
    courseId: 'c_abc',
    weekday: 3,
    startPeriod: 1,
    endPeriod: 2,
    weeks: [1, 2, 3, 4],
    location: 'A101',
  };

  it('字段相同 → Session ID 相同', () => {
    expect(sessionIdFor(base)).toBe(sessionIdFor({ ...base }));
  });
  it('地点变化 → ID 不同', () => {
    expect(sessionIdFor(base)).not.toBe(sessionIdFor({ ...base, location: 'B202' }));
  });
  it('周次变化 → ID 不同', () => {
    expect(sessionIdFor(base)).not.toBe(sessionIdFor({ ...base, weeks: [1, 2, 3] }));
  });
  it('星期变化 → ID 不同', () => {
    expect(sessionIdFor(base)).not.toBe(sessionIdFor({ ...base, weekday: 4 }));
  });
});
