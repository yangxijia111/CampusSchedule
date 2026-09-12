/**
 * 文本归一化工具。
 * 课表原始文本来自学校页面，常见问题：全角/半角混排、多余空白、换行。
 * 所有归一化必须保留原语义，不得删除有意义的字符。
 */

/** 全角/中文标点 → 半角标点的映射（用于解析前的文本清理）。 */
const PUNCTUATION_MAP: Record<string, string> = {
  '（': '(',
  '）': ')',
  '，': ',',
  '、': ',',
  '：': ':',
  '；': ';',
  '【': '[',
  '】': ']',
  '－': '-',
  '～': '~',
};

/** 将全角/中文标点转换为半角标点。 */
export function normalizeFullWidthPunctuation(text: string): string {
  return text.replace(/[（） ，、：；【】－～]/g, (ch) => PUNCTUATION_MAP[ch] ?? ch);
}

/** 折叠所有空白（含全角空格、换行、制表符）为单个半角空格，并去除首尾空白。 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/[\s\u3000]+/g, ' ').trim();
}

/** 通用文本归一化：标点 + 空白。适用于课程名、地点等展示字段。 */
export function normalizeText(text: string): string {
  return normalizeWhitespace(normalizeFullWidthPunctuation(text));
}

/**
 * 归一化教师姓名列表。
 * 支持分隔符：/ 、 ， , ； ; 以及换行；过滤空项。
 */
export function normalizeTeacherNames(raw: string): string[] {
  if (!raw) return [];
  return normalizeWhitespace(raw)
    .split(/[/,;，、；\n]/)
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

/** 归一化上课地点（保留内部空格结构，如 "教学楼 A101"）。 */
export function normalizeLocation(raw: string): string {
  return normalizeText(raw);
}

/** 周次专用归一化：移除全部空白、全角标点转半角（周次文本中空白无意义）。 */
export function normalizeWeekText(raw: string): string {
  return normalizeFullWidthPunctuation(raw).replace(/[\s\u3000]+/g, '');
}
