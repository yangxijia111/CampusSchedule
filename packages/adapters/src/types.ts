import type {
  Course,
  NormalizedTimetable,
  ParseResult,
  Semester,
} from '@campusschedule/core';

/**
 * 学校适配器接口（02 架构）。
 *
 * 规则：
 * - core 中不得出现任何学校差异（URL / selector / 周次格式），全部收敛在 Adapter；
 * - 无法识别时必须失败（ParseResult.ok === false），禁止返回空数据冒充成功；
 * - 适配器不接触任何认证凭据。
 */
export interface PageDetectionResult {
  /** Level 1：当前 URL 属于本校域名。 */
  domainMatched: boolean;
  /** Level 2：页面语义命中课表关键词（"学期课表/我的课表/课表查询"等）。 */
  semanticMatched: boolean;
  /** Level 3：页面结构命中课表结构（学期选择器/星期列/节次行/课程格）。 */
  structureMatched: boolean;
  /** 页面存在密码输入框：导入按钮必须禁用，不读取任何表单内容。 */
  isLoginPage: boolean;
  /** 判定依据说明（用于 Debug Panel 展示）。 */
  reasons: string[];
}

export interface ParseContext {
  semester: Semester;
}

export interface SchoolAdapter {
  id: string;
  displayName: string;
  /** 适配器版本：selector/解析逻辑变化时必须 bump。 */
  version: string;

  /** Level 1：URL 是否属于本校（仅域名判断，不读页面）。 */
  matchLocation(location: Location | URL): boolean;

  /** Level 1-3：综合检测当前页面状态（不读取任何表单值）。 */
  detectPage(document: Document, location: Location | URL): PageDetectionResult;

  /** 解析学期上下文；失败时返回错误而不是猜测。 */
  parseSemesterContext(document: Document): ParseResult<Semester>;

  /** 解析课表；失败时返回错误而不是猜测。 */
  parseTimetable(
    document: Document,
    context: ParseContext,
  ): ParseResult<NormalizedTimetable & { courses: Course[] }>;
}
