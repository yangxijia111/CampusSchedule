/**
 * 将周次数组压缩为可读文本：[1,2,3,5,7,8] → "1-3,5,7-8周"。
 * 仅用于展示，不参与解析。
 */
export function formatWeeksText(weeks: number[]): string {
  if (weeks.length === 0) return '';
  const sorted = [...new Set(weeks)].sort((a, b) => a - b);
  const parts: string[] = [];
  let runStart = sorted[0]!;
  let prev = sorted[0]!;
  for (let i = 1; i <= sorted.length; i += 1) {
    const current = sorted[i];
    const isRunEnd = current === undefined || current !== prev + 1;
    if (isRunEnd) {
      parts.push(runStart === prev ? String(runStart) : runStart + '-' + prev);
      if (current !== undefined) {
        runStart = current;
      }
    }
    prev = current ?? prev;
  }
  return parts.join(',') + '周';
}
