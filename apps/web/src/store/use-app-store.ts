import { create } from 'zustand';
import type { Course, PeriodDefinition, Semester } from '@campusschedule/core';
import { totalWeeksOf, weekOfDate } from '@campusschedule/core';
import { mockCourses, mockPeriodTimes, mockSemester, MOCK_SCHOOL_ID } from '../mock/mock-timetable';
import { getRepository, periodTimesKey } from '../lib/storage';

export interface AppSettings {
  /** 上课前提醒分钟数。 */
  reminderMinutes: number;
  /** 是否显示周末列。 */
  showWeekend: boolean;
  /** 24 小时制。 */
  use24Hour: boolean;
  /** 每周起始日：1 周一 / 7 周日。 */
  weekStart: 1 | 7;
}

interface AppState {
  hydrated: boolean;
  semesters: Semester[];
  activeSemesterId: string;
  coursesBySemester: Record<string, Course[]>;
  periodTimesBySemester: Record<string, PeriodDefinition[]>;
  settings: AppSettings;
  /** 用户手动选择的周（null = 跟随当前周）。 */
  selectedWeek: number | null;

  /** 从 IndexedDB 加载数据；首次使用时写入示例课表。 */
  hydrate(): Promise<void>;
  activeSemester(): Semester | null;
  activeCourses(): Course[];
  activePeriodTimes(): PeriodDefinition[];
  /** 当前真实教学周（依据系统日期；开学前为 0）。 */
  currentWeek(): number;
  /** 展示用周：手动选择优先。 */
  displayWeek(): number;
  totalWeeks(): number;

  setSelectedWeek: (week: number | null) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  /** 用导入数据替换某学期的课表（Phase 8 起使用），同步落库。 */
  replaceSemesterData: (
    semester: Semester,
    courses: Course[],
    periodTimes?: PeriodDefinition[],
  ) => Promise<void>;
  deleteSemesterData: (semesterId: string) => Promise<void>;
}

function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return now.getFullYear() + '-' + month + '-' + day;
}

/** hydrate 防重入（StrictMode 双渲染 / 快速刷新）。 */
let hydrating = false;

/** 首次使用时写入示例课表（标记 isMock），保证开箱可用。 */
async function seedMockData() {
  const repo = getRepository();
  await repo.saveSchool({ id: MOCK_SCHOOL_ID, displayName: '示例大学（Mock）' });
  await repo.saveSemester(mockSemester);
  await repo.replaceSemesterCourses(mockSemester.id, mockCourses);
  await repo.setSetting(periodTimesKey(mockSemester.id), mockPeriodTimes);
  await repo.saveImportRecord({
    id: 'seed-' + mockSemester.id,
    semesterId: mockSemester.id,
    importedAt: new Date().toISOString(),
    schoolId: MOCK_SCHOOL_ID,
    adapterVersion: 'mock',
    pageUrl: 'about:mock',
    courseCount: mockCourses.length,
    sessionCount: mockCourses.reduce((n, c) => n + c.sessions.length, 0),
    warningCount: 0,
    isMock: true,
  });
}

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  semesters: [],
  activeSemesterId: '',
  coursesBySemester: {},
  periodTimesBySemester: {},
  settings: {
    reminderMinutes: 15,
    showWeekend: false,
    use24Hour: true,
    weekStart: 1,
  },
  selectedWeek: null,

  hydrate: async () => {
    if (hydrating || get().hydrated) return;
    hydrating = true;
    try {
      const repo = getRepository();
      let semesters = await repo.getSemesters();

      if (semesters.length === 0) {
        await seedMockData();
        semesters = [mockSemester];
      }

      const coursesBySemester: Record<string, Course[]> = {};
      const periodTimesBySemester: Record<string, PeriodDefinition[]> = {};
      for (const semester of semesters) {
        coursesBySemester[semester.id] = await repo.getCourses(semester.id);
        const periodTimes = await repo.getSetting<PeriodDefinition[]>(
          periodTimesKey(semester.id),
        );
        if (periodTimes) {
          periodTimesBySemester[semester.id] = periodTimes;
        }
      }

      const savedActive = await repo.getSetting<string>('activeSemesterId');
      const activeSemesterId = semesters.some((s) => s.id === savedActive)
        ? savedActive!
        : semesters[semesters.length - 1]!.id;
      set({ hydrated: true, semesters, activeSemesterId, coursesBySemester, periodTimesBySemester });
    } finally {
      hydrating = false;
    }
  },

  activeSemester: () => {
    const state = get();
    return state.semesters.find((s) => s.id === state.activeSemesterId) ?? null;
  },
  activeCourses: () => {
    const state = get();
    return state.coursesBySemester[state.activeSemesterId] ?? [];
  },
  activePeriodTimes: () => {
    const state = get();
    return state.periodTimesBySemester[state.activeSemesterId] ?? [];
  },
  currentWeek: () => {
    const semester = get().activeSemester();
    if (!semester || !semester.startDate) return 1;
    return weekOfDate(semester, todayIsoDate());
  },
  displayWeek: () => {
    const state = get();
    if (state.selectedWeek !== null) return state.selectedWeek;
    const current = state.currentWeek();
    const total = state.totalWeeks();
    if (current <= 0) return 1;
    return Math.min(current, total);
  },
  totalWeeks: () => {
    const state = get();
    const semester = state.semesters.find((s) => s.id === state.activeSemesterId);
    if (!semester) return 1;
    return totalWeeksOf(semester, state.coursesBySemester[semester.id] ?? []);
  },

  setSelectedWeek: (week) => set({ selectedWeek: week }),
  updateSettings: (patch) =>
    set((state) => ({ settings: { ...state.settings, ...patch } })),
  replaceSemesterData: async (semester, courses, periodTimes) => {
    const repo = getRepository();
    await repo.saveSemester(semester);
    await repo.replaceSemesterCourses(semester.id, courses);
    if (periodTimes) {
      await repo.setSetting(periodTimesKey(semester.id), periodTimes);
    }
    await repo.setSetting('activeSemesterId', semester.id);
    set((state) => ({
      semesters: state.semesters.some((s) => s.id === semester.id)
        ? state.semesters.map((s) => (s.id === semester.id ? semester : s))
        : [...state.semesters, semester],
      coursesBySemester: { ...state.coursesBySemester, [semester.id]: courses },
      periodTimesBySemester: periodTimes
        ? { ...state.periodTimesBySemester, [semester.id]: periodTimes }
        : state.periodTimesBySemester,
      activeSemesterId: semester.id,
    }));
  },
  deleteSemesterData: async (semesterId) => {
    const repo = getRepository();
    await repo.deleteSemester(semesterId);
    set((state) => {
      const semesters = state.semesters.filter((s) => s.id !== semesterId);
      const coursesBySemester = { ...state.coursesBySemester };
      delete coursesBySemester[semesterId];
      const periodTimesBySemester = { ...state.periodTimesBySemester };
      delete periodTimesBySemester[semesterId];
      const nextActive =
        state.activeSemesterId === semesterId
          ? (semesters[0]?.id ?? '')
          : state.activeSemesterId;
      return { semesters, coursesBySemester, periodTimesBySemester, activeSemesterId: nextActive };
    });
  },
}));

/**
 * 组件订阅 hooks（zustand v5 要求 selector 返回稳定引用，
 * 空数组必须使用模块级常量，否则 useSyncExternalStore 会陷入无限渲染循环）。
 */
const EMPTY_COURSES: Course[] = [];
const EMPTY_PERIOD_TIMES: PeriodDefinition[] = [];
const NULL_SEMESTER: Semester | null = null;

export function useActiveSemester(): Semester | null {
  return useAppStore((s) => s.semesters.find((item) => item.id === s.activeSemesterId) ?? NULL_SEMESTER);
}

export function useActiveCourses(): Course[] {
  return useAppStore((s) => s.coursesBySemester[s.activeSemesterId] ?? EMPTY_COURSES);
}

export function useActivePeriodTimes(): PeriodDefinition[] {
  return useAppStore((s) => s.periodTimesBySemester[s.activeSemesterId] ?? EMPTY_PERIOD_TIMES);
}

/** 以下三个返回原始 number，selector 结果天然稳定。 */
export function useCurrentWeek(): number {
  return useAppStore((s) => s.currentWeek());
}

export function useDisplayWeek(): number {
  return useAppStore((s) => s.displayWeek());
}

export function useTotalWeeks(): number {
  return useAppStore((s) => s.totalWeeks());
}
