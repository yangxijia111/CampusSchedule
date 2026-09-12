import type { PageDetectionResult } from '../types';

/**
 * GDIPU 页面检测（04 规格 §4）。
 *
 * 三级检测：
 * - Level 1 域名：*.gdipu.edu.cn；
 * - Level 2 语义：页面文本/标题含课表关键词；
 * - Level 3 结构：星期表格 / 节次 / 学期选择等结构信号。
 *
 * 检测只做"存在性"检查，不读取任何表单值；
 * 只有 Level 2 + Level 3 同时足够可信时才认定为课表页面。
 */

/** 学校官方域后缀。注意：不把 my.gdipu.edu.cn 等同于课表页面，登录后可能跳转到其他系统。 */
const GDIPU_DOMAIN = 'gdipu.edu.cn';

/** Level 2 语义关键词。 */
const TIMETABLE_KEYWORDS = [
  '学期课表',
  '我的课表',
  '学生课表',
  '个人课表',
  '课表查询',
  '理论课表',
  '实训课表',
  '课程表',
  '上课时间',
];

/** Level 3 星期表头关键词。 */
const WEEKDAY_HEADERS = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日', '周一', '周二', '周三', '周四', '周五', '周六', '周日'];

/** 学期文本关键词（用于提取候选学期字符串）。 */
const SEMESTER_KEYWORDS = ['学年', '学期'];

/** Level 1：是否 GDIPU 官方域。 */
export function isGdipuLocation(location: Location | URL): boolean {
  let hostname: string;
  if (location instanceof URL) {
    hostname = location.hostname;
  } else {
    hostname = location.hostname;
  }
  return hostname === GDIPU_DOMAIN || hostname.endsWith('.' + GDIPU_DOMAIN);
}

/** 是否登录页：存在密码输入框（仅检查存在性，不读取内容）。 */
export function isLoginPage(document: Document): boolean {
  return document.querySelector('input[type="password"]') !== null;
}

/** Level 2：页面语义关键词命中。 */
export function semanticDetect(document: Document): { matched: boolean; hits: string[] } {
  const haystack = (document.title ?? '') + ' ' + (document.body?.innerText ?? '');
  if (!haystack.trim()) {
    // innerText 在非渲染环境可能为空，退回 textContent
    const fallback = (document.title ?? '') + ' ' + (document.body?.textContent ?? '');
    return detectKeywords(fallback);
  }
  return detectKeywords(haystack);
}

function detectKeywords(haystack: string): { matched: boolean; hits: string[] } {
  const hits = TIMETABLE_KEYWORDS.filter((keyword) => haystack.includes(keyword));
  return { matched: hits.length > 0, hits };
}

export interface StructureSignals {
  matched: boolean;
  signals: string[];
  /** 课表容器候选（用于快照导出）。 */
  timetableContainer: Element | null;
}

/** Level 3：页面结构信号。 */
export function structureDetect(document: Document): StructureSignals {
  const signals: string[] = [];
  let container: Element | null = null;

  // 信号 1：存在表格，且某行含 ≥5 个星期名
  const tables = [...document.querySelectorAll('table')];
  for (const table of tables) {
    const rows = [...table.querySelectorAll('tr')];
    const weekdayCount = rows.reduce((max, row) => {
      const cells = [...row.querySelectorAll('th,td')].map((cell) => cell.textContent ?? '');
      const hit = WEEKDAY_HEADERS.filter((name) => cells.some((text) => text.includes(name)));
      return Math.max(max, hit.length);
    }, 0);
    if (weekdayCount >= 5) {
      signals.push('检测到星期表格（' + weekdayCount + ' 列）');
      if (!container) {
        container = table;
      }
    }
  }

  // 信号 2：学期/学年选择器
  const selects = [...document.querySelectorAll('select')];
  const semesterSelect = selects.find((select) => {
    const options = [...select.querySelectorAll('option')].map((o) => o.textContent ?? '');
    const hasSemesterWord = options.some((text) => SEMESTER_KEYWORDS.some((k) => text.includes(k)));
    return hasSemesterWord;
  });
  if (semesterSelect) {
    signals.push('检测到学期选择器');
  }

  // 信号 3：节次行（"第 N 节" / "N-N 节"）
  const bodyText = document.body?.innerText || document.body?.textContent || '';
  if (/第\s*\d+\s*节/.test(bodyText) || /\d+\s*[-–]\s*\d+\s*节/.test(bodyText)) {
    signals.push('检测到节次文本');
  }

  return { matched: signals.length >= 2, signals, timetableContainer: container };
}

/** 页面中的学期文本候选（脱敏后由快照带走，供 Phase 7 parser 开发参考）。 */
export function findSemesterTextCandidates(document: Document, limit = 5): string[] {
  const text = document.body?.innerText || document.body?.textContent || '';
  const candidates: string[] = [];
  for (const keyword of SEMESTER_KEYWORDS) {
    let index = text.indexOf(keyword);
    while (index !== -1 && candidates.length < limit) {
      const start = Math.max(0, index - 30);
      const fragment = text.slice(start, Math.min(text.length, index + 30)).replace(/\s+/g, ' ').trim();
      if (!candidates.includes(fragment)) {
        candidates.push(fragment);
      }
      index = text.indexOf(keyword, index + keyword.length);
    }
  }
  return candidates;
}

/** GDIPU 页面检测入口。 */
export function detectGdipuPage(document: Document, location: Location | URL): PageDetectionResult {
  const domainMatched = isGdipuLocation(location);
  const semantic = semanticDetect(document);
  const structure = structureDetect(document);
  const login = isLoginPage(document);

  const reasons: string[] = [];
  if (domainMatched) {
    reasons.push('域名属于 *.gdipu.edu.cn');
  }
  if (semantic.matched) {
    reasons.push('页面关键词：' + semantic.hits.join('、'));
  }
  reasons.push(...structure.signals);
  if (login) {
    reasons.push('当前页面包含密码输入框（登录页，不解析）');
  }

  return {
    domainMatched,
    semanticMatched: semantic.matched,
    structureMatched: structure.matched,
    isLoginPage: login,
    reasons,
  };
}
