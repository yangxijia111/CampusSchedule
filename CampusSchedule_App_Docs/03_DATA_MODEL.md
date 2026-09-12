# 03 — 数据模型与课表规则

## 1. 核心模型

```ts
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Semester {
  id: string;
  schoolId: string;

  academicYear: string; // "2026-2027"
  term: 1 | 2 | 3;

  displayName: string;

  startDate?: string;   // YYYY-MM-DD
  totalWeeks?: number;
}

export interface Course {
  id: string;
  semesterId: string;

  name: string;
  courseCode?: string;

  teacherNames: string[];
  credit?: number;
  category?: string;

  sessions: CourseSession[];

  note?: string;
}

export interface CourseSession {
  id: string;
  courseId: string;

  weekday: Weekday;

  startPeriod: number;
  endPeriod: number;

  weeks: number[];

  location?: string;
  teacherNames?: string[];

  rawText?: string;
}
```

## 2. 为什么 Course 和 CourseSession 分开

同一课程可能：

- 周一 1-2 节；
- 周三 3-4 节；
- 不同周在不同教室；
- 理论课与实训课地点不同。

因此不能用一个 Course 直接表示全部时间。

## 3. 周次解析

必须支持：

```text
1-16周
1-8周
9-16周
1-16周(单)
1-16周(双)
1,3,5,7周
1-8,10-12周
第1-4周
1-4周,6周,8-10周
```

标准输出：

```ts
number[]
```

例：

```text
"1-8,10-12周"
=> [1,2,3,4,5,6,7,8,10,11,12]
```

### 单周

```text
1-16周(单)
=> [1,3,5,7,9,11,13,15]
```

### 双周

```text
1-16周(双)
=> [2,4,6,8,10,12,14,16]
```

## 4. 节次

不要假设所有学校：

```text
1-2
3-4
5-6
```

Adapter 应读取/配置：

```ts
interface PeriodDefinition {
  period: number;
  startTime: string;
  endTime: string;
}
```

GDIPU 的准确节次时间必须：

- 从当前学校公开校历/作息表读取；或
- 由用户配置。

没有可靠数据时不能硬编码成“常见大学时间”。

## 5. 文本归一化

需要：

```ts
normalizeWhitespace()
normalizeFullWidthPunctuation()
normalizeTeacherNames()
normalizeLocation()
normalizeWeekText()
```

保留原始字段：

```ts
rawText
```

这样解析出现问题时可以追踪。

## 6. ID

禁止使用数据库自增 ID 作为跨导入身份。

推荐稳定 hash：

```text
Course ID:
schoolId + semester + normalizedCourseName + courseCode

Session ID:
courseId + weekday + periods + location + weeks
```

## 7. 冲突

出现两个课程同时占用某节时：

- 不删除；
- 不自动合并；
- UI 标记冲突；
- 保留两个 Session。

## 8. Import Warning

```ts
interface ImportWarning {
  code:
    | "UNKNOWN_WEEK_FORMAT"
    | "UNKNOWN_PERIOD_FORMAT"
    | "MISSING_LOCATION"
    | "MISSING_TEACHER"
    | "AMBIGUOUS_CELL"
    | "ADAPTER_OUTDATED";

  message: string;
  raw?: string;
}
```
