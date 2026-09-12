import { create } from 'zustand';
import type { Course, PeriodDefinition, Semester } from '@campusschedule/core';
import { semesterSchema, totalWeeksOf, validatePeriodDefinitions, weekOfDate } from '@campusschedule/core';
import type { ImportRecord } from '@campusschedule/storage';
import { mockCourses, mockPeriodTimes, mockSemester, MOCK_SCHOOL_ID } from '../mock/mock-timetable';
import { getRepository, periodTimesKey } from '../lib/storage';
import { DEFAULT_SETTINGS, SETTINGS_KEY, mergeSettings } from '../lib/settings';
import type { AppSettings } from '../lib/settings';

interface AppState {
  hydrated: boolean;
  semesters: Semester[];
  activeSemesterId: string;
  coursesBySemester: Record<string, Course[]>;
  periodTimesBySemester: Record<string, PeriodDefinition[]>;
  /** 每个学期最近一次导入记录（用于判断数据来源，如示例数据 isMock）。 */
  latestImportBySemester: Record<string, ImportRecord>;
  settings: AppSettings;
  /** 用户手动选择的周（null = 跟随当前周）。 */
  selectedWeek: number | null;

  /** 从 IndexedDB 加载数据。没有数据时保持空状态，由用户显式选择后续动作。 */
  hydrate(): Promise<void>;
  activeSemester(): Semester | null;
  activeCourses(): Course[];
  activePeriodTimes(): PeriodDefinition[];
  /** 当前学期课表是否来自示例数据（依据最近导入记录的 isMock）。 */
  activeSemesterIsMock(): boolean;
  /** 当前真实教学周（依据系统日期；开学前为 0）。 */
  currentWeek(): number;
  /** 展示用周：手动选择优先。 */
  displayWeek(): number;
  totalWeeks(): number;

  setSelectedWeek: (week: number | null) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  /** 切换当前学期并持久化 activeSemesterId。 */
  setActiveSemester: (semesterId: string) => Promise<void>;
  /** 修改学期校历（开学日期 / 总周数）并持久化。 */
  updateSemesterCalendar: (
    semesterId: string,
    patch: { startDate?: string; totalWeeks?: number },
  ) => Promise<void>;
  /** 保存某学期的作息时间并持久化。 */
  savePeriodTimes: (semesterId: string, definitions: PeriodDefinition[]) => Promise<void>;
  /** 用导入数据替换某学期的课表（Phase 8 起使用），同步落库。 */
  replaceSemesterData: (
    semester: Semester,
    courses: Course[],
    periodTimes?: PeriodDefinition[],
  ) => Promise<void>;
  /** 保存导入记录并更新内存中的最近导入索引。 */
  recordImport: (record: ImportRecord) => Promise<void>;
  deleteSemesterData: (semesterId: string) => Promise<void>;
  /** 用户显式点击“体验示例课表”时写入示例数据（开箱演示）。 */
  loadDemoTimetable: () => Promise<void>;
  /** 清空全部本地数据并回到空状态。 */
  clearAllData: () => Promise<void>;
}

function todayIsoDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return now.getFullYear() + '-' + month + '-' + day;
}

/** hydrate 防重入（StrictMode 双渲染 / 快速刷新）。 */
let hydrating = false;

/** 从导入记录中取最近一条（按 importedAt 比较）。 */
function latestImportOf(records: ImportRecord[]): ImportRecord | null {
  if (records.length === 0) return null;
  return records.reduce((latest, record) =>
    record.importedAt > latest.importedAt ? record : latest,
  );
}

/** 每学期批量加载课程、作息与最近导入记录。 */
async function loadSemesterState(
  semesters: Semester[],
): Promise<{
  coursesBySemester: Record<string, Course[]>;
  periodTimesBySemester: Record<string, PeriodDefinition[]>;
  latestImportBySemester: Record<string, ImportRecord>;
}> {
  const repo = getRepository();
  const coursesBySemester: Record<string, Course[]> = {};
  const periodTimesBySemester: Record<string, PeriodDefinition[]> = {};
  const latestImportBySemester: Record<string, ImportRecord> = {};
  for (const semester of semesters) {
    coursesBySemester[semester.id] = await repo.getCourses(semester.id);
    const periodTimes = await repo.getSetting<PeriodDefinition[]>(
      periodTimesKey(semester.id),
    );
    if (periodTimes) {
      periodTimesBySemester[semester.id] = periodTimes;
    }
    const latest = latestImportOf(await repo.getImportRecords(semester.id));
    if (latest) {
      latestImportBySemester[semester.id] = latest;
    }
  }
  return { coursesBySemester, periodTimesBySemester, latestImportBySemester };
}

/** 写入示例课表数据（标记 isMock 的导入记录），仅在用户显式请求时调用。 */
async function seedMockData(): Promise<ImportRecord> {
  const repo = getRepository();
  const record: ImportRecord = {
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
  };
  await repo.saveSchool({ id: MOCK_SCHOOL_ID, displayName: '示例大学（Mock）' });
  await repo.saveSemester(mockSemester);
  await repo.replaceSemesterCourses(mockSemester.id, mockCourses);
  await repo.setSetting(periodTimesKey(mockSemester.id), mockPeriodTimes);
  await repo.saveImportRecord(record);
  return record;
}

export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  semesters: [],
  activeSemesterId: '',
  coursesBySemester: {},
  periodTimesBySemester: {},
  latestImportBySemester: {},
  settings: DEFAULT_SETTINGS,
  selectedWeek: null,

  hydrate: async () => {
    if (hydrating || get().hydrated) return;
    hydrating = true;
    try {
      const repo = getRepository();
      const semesters = await repo.getSemesters();
      const { coursesBySemester, periodTimesBySemester, latestImportBySemester } =
        await loadSemesterState(semesters);

      const savedActive = semesters.length > 0 ? await repo.getSetting<string>('activeSemesterId') : undefined;
      const activeSemesterId =
        semesters.length > 0
          ? semesters.some((s) => s.id === savedActive)
            ? savedActive!
            : semesters[semesters.length - 1]!.id
          : '';
      // 设置从 IndexedDB 恢复，与默认值合并（脏数据逐字段回落）
      const settings = mergeSettings(await repo.getSetting(SETTINGS_KEY));
      set({ hydrated: true, semesters, activeSemesterId, coursesBySemester, periodTimesBySemester, latestImportBySemester, settings });
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
  activeSemesterIsMock: () => {
    const state = get();
    return state.latestImportBySemester[state.activeSemesterId]?.isMock ?? false;
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
  setActiveSemester: async (semesterId) => {
    const exists = get().semesters.some((s) => s.id === semesterId);
    if (!exists) return;
    set({ activeSemesterId: semesterId, selectedWeek: null });
    await getRepository().setSetting('activeSemesterId', semesterId);
  },
  updateSemesterCalendar: async (semesterId, patch) => {
    const current = get().semesters.find((s) => s.id === semesterId);
    if (!current) throw new Error('学期不存在');
    const next: Semester = {
      ...current,
      ...(patch.startDate !== undefined ? { startDate: patch.startDate } : {}),
      ...(patch.totalWeeks !== undefined ? { totalWeeks: patch.totalWeeks } : {}),
    };
    // 复用 core 的学期 schema 校验（日期格式 / 周次范围）
    const check = semesterSchema.safeParse(next);
    if (!check.success) {
      throw new Error(check.error.issues[0]?.message ?? '校历数据不合法');
    }
    await getRepository().saveSemester(next);
    set((state) => ({
      semesters: state.semesters.map((s) => (s.id === semesterId ? next : s)),
    }));
  },
  savePeriodTimes: async (semesterId, definitions) => {
    const check = validatePeriodDefinitions(definitions);
    if (!check.ok) {
      throw new Error(check.message);
    }
    await getRepository().setSetting(periodTimesKey(semesterId), definitions);
    set((state) => ({
      periodTimesBySemester: { ...state.periodTimesBySemester, [semesterId]: definitions },
    }));
  },
  updateSettings: (patch) => {
    // UI 立即生效；持久化异步进行，失败仅告警（不产生未处理 Promise 拒绝）
    const settings: AppSettings = { ...get().settings, ...patch };
    set({ settings });
    getRepository()
      .setSetting(SETTINGS_KEY, settings)
      .catch((error: unknown) => {
        console.warn('[CampusSchedule] 设置持久化失败（仅本次会话生效）:', error);
      });
  },
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
  recordImport: async (record) => {
    await getRepository().saveImportRecord(record);
    set((state) => ({
      latestImportBySemester: { ...state.latestImportBySemester, [record.semesterId]: record },
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
      const latestImportBySemester = { ...state.latestImportBySemester };
      delete latestImportBySemester[semesterId];
      const nextActive =
        state.activeSemesterId === semesterId
          ? (semesters[0]?.id ?? '')
          : state.activeSemesterId;
      return { semesters, coursesBySemester, periodTimesBySemester, latestImportBySemester, activeSemesterId: nextActive };
    });
  },
  loadDemoTimetable: async () => {
    // 用户显式请求示例数据（Empty State 按钮）；不自动触发
    const record = await seedMockData();
    const { coursesBySemester, periodTimesBySemester, latestImportBySemester } =
      await loadSemesterState([mockSemester]);
    set((state) => ({
      semesters: state.semesters.some((s) => s.id === mockSemester.id)
        ? state.semesters.map((s) => (s.id === mockSemester.id ? mockSemester : s))
        : [...state.semesters, mockSemester],
      coursesBySemester: { ...state.coursesBySemester, ...coursesBySemester },
      periodTimesBySemester: { ...state.periodTimesBySemester, ...periodTimesBySemester },
      latestImportBySemester: { ...state.latestImportBySemester, ...latestImportBySemester, [record.semesterId]: record },
      activeSemesterId: mockSemester.id,
      selectedWeek: null,
    }));
  },
  clearAllData: async () => {
    await getRepository().clearAll();
    // 设置随“清除全部本地数据”一并清除（语义即全部本地数据）
    set({
      semesters: [],
      activeSemesterId: '',
      coursesBySemester: {},
      periodTimesBySemester: {},
      latestImportBySemester: {},
      selectedWeek: null,
      settings: DEFAULT_SETTINGS,
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

/** 返回 boolean，selector 结果天然稳定。 */
export function useActiveSemesterIsMock(): boolean {
  return useAppStore((s) => s.latestImportBySemester[s.activeSemesterId]?.isMock ?? false);
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
