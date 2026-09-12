# 02 — 技术架构

## 1. 技术选型

### Web/PWA

- React
- TypeScript
- Vite
- React Router
- Zustand
- Dexie.js / IndexedDB
- Zod
- date-fns
- Tailwind CSS（可选）
- Vitest
- Playwright

### Browser Extension

- Chromium Manifest V3
- TypeScript
- Vite
- content script
- service worker
- options/import page

建议支持：

- Chrome
- Edge

## 2. 总体架构

```text
┌──────────────────────────────┐
│ School Official Site         │
│ 用户自行登录                  │
│ timetable page               │
└──────────────┬───────────────┘
               │ content script
               ▼
┌──────────────────────────────┐
│ CampusSchedule Importer      │
│                              │
│ School Detector              │
│ Adapter Registry             │
│ GDIPU Adapter                │
│ DOM/API Parser               │
│ Validation                   │
└──────────────┬───────────────┘
               │ normalized JSON
               ▼
┌──────────────────────────────┐
│ CampusSchedule PWA           │
│                              │
│ Import Preview               │
│ Course Engine                │
│ Week Resolver                │
│ Diff Engine                  │
│ Timetable UI                 │
│ Reminder / ICS               │
└──────────────┬───────────────┘
               │
               ▼
          IndexedDB
```

## 3. Adapter 接口

```ts
export interface SchoolAdapter {
  id: string;
  displayName: string;

  matchLocation(location: Location): boolean;

  detectPage(
    document: Document,
    location: Location
  ): PageDetectionResult;

  parseSemesterContext(
    document: Document
  ): ParseResult<SemesterContext>;

  parseTimetable(
    document: Document,
    context: ParseContext
  ): ParseResult<NormalizedTimetable>;
}
```

禁止在 `core` 中出现：

- `gdipu`
- 某学校 URL
- 某学校 DOM selector

学校差异必须全部放进 Adapter。

## 4. Adapter Registry

```ts
const adapters: SchoolAdapter[] = [
  gdipuAdapter,
];

export function resolveAdapter(
  document: Document,
  location: Location
): SchoolAdapter | null {
  return adapters.find(a => a.matchLocation(location)) ?? null;
}
```

## 5. Parser 分层

不要写一个 1000 行 Parser。

分成：

```text
GDIPUAdapter
├─ detect.ts
├─ semester.ts
├─ timetable.ts
├─ rowParser.ts
├─ weekParser.ts
├─ periodParser.ts
├─ selectors.ts
├─ fixtures/
└─ tests/
```

## 6. 数据导入协议

Extension 输出：

```ts
interface ImportEnvelope {
  protocolVersion: 1;
  source: {
    schoolId: string;
    adapterVersion: string;
    pageUrl: string;
    importedAt: string;
  };
  semester: Semester;
  courses: Course[];
  warnings: ImportWarning[];
}
```

注意：

`pageUrl` 保存前必须去除：

- query 中可能的 token；
- session id；
- hash 中的敏感参数。

## 7. Web 与 Extension 通信

MVP 推荐两种方式择一：

### 方案 A：JSON 文件

扩展：

- 点击导出；
- 生成 `.campusschedule.json`。

PWA：

- 用户导入文件。

优点：

- 简单；
- 不需要跨域通信；
- 好调试。

缺点：

- 多一步。

### 方案 B：Extension Bridge

后续再做。

通过：

- `window.postMessage`
- extension content script
- chrome runtime message

把 JSON 发送给已打开的 CampusSchedule Web。

首版先做 A，稳定后升级 B。

## 8. 本地存储

IndexedDB：

```text
schools
semesters
courses
sessions
settings
imports
```

推荐 Dexie schema：

```ts
db.version(1).stores({
  schools: "id",
  semesters: "id, schoolId, academicYear, term",
  courses: "id, semesterId, name",
  sessions: "id, courseId, weekday",
  imports: "id, semesterId, importedAt",
  settings: "key"
});
```

## 9. Diff Engine

重新导入时：

CourseSession fingerprint：

```text
normalizedCourseName
teacher
location
weekday
startPeriod
endPeriod
weeks
```

输出：

```ts
interface TimetableDiff {
  added: CourseSession[];
  removed: CourseSession[];
  changed: {
    before: CourseSession;
    after: CourseSession;
    fields: string[];
  }[];
}
```

## 10. 日历引擎

输入：

- semester.startDate
- teachingWeek
- weekday
- weeks
- period time

输出：

- 真实日期；
- ICS event。

必须处理：

- 单周；
- 双周；
- 非连续周；
- 调课后的离散周；
- 法定节假日不自动猜测停课。

除非学校数据明确提供，否则不能自行假设节假日停课。
