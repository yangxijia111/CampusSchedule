import { sanitizePageUrl } from '@campusschedule/importer-protocol';
import type { PageDetectionResult } from '../types';
import { findSemesterTextCandidates, structureDetect } from './detect';
import { sanitizeDomForSnapshot, sanitizeTextFragment } from './snapshot-sanitize';
import { GDIPU_ADAPTER_ID, GDIPU_ADAPTER_VERSION } from './version';

/**
 * 生成脱敏课表快照（04 规格 §6）。
 *
 * 输出两个文件：
 * - gdipu-timetable-snapshot.html：课表容器（脱敏 HTML）；
 * - gdipu-debug.json：调试信息（脱敏 URL、标题、检测结论、学期候选、统计）。
 *
 * 必须在用户预览确认后再触发下载。
 */
export interface DebugSnapshot {
  htmlFileName: string;
  htmlContent: string;
  debugFileName: string;
  debugJson: string;
}

export function buildTimetableSnapshot(
  document: Document,
  location: Location | URL,
  detection: PageDetectionResult,
): DebugSnapshot {
  const structure = structureDetect(document);
  // 快照容器：优先课表表格；否则退回 body（仍会脱敏）
  const container = structure.timetableContainer ?? document.body;
  const sanitizedUrl = sanitizePageUrl(location.href);
  const title = sanitizeTextFragment((document.title ?? '').slice(0, 120));
  const semesterCandidates = findSemesterTextCandidates(document).map(sanitizeTextFragment);

  const htmlContent = [
    '<!doctype html>',
    '<html lang="zh-CN">',
    '<head><meta charset="utf-8"><title>GDIPU 课表脱敏快照</title></head>',
    '<body>',
    '<!-- CampusSchedule 脱敏快照：已移除脚本/样式/表单值/学号等敏感信息 -->',
    '<!-- 来源页面: ' + sanitizedUrl + ' -->',
    sanitizeDomForSnapshot(container ?? document.documentElement),
    '</body>',
    '</html>',
  ].join('\n');

  const debugInfo = {
    kind: 'campusschedule-gdipu-debug',
    adapterId: GDIPU_ADAPTER_ID,
    adapterVersion: GDIPU_ADAPTER_VERSION,
    generatedAt: new Date().toISOString(),
    pageUrl: sanitizedUrl,
    pageTitle: title,
    detection,
    structureSignals: structure.signals,
    semesterTextCandidates: semesterCandidates,
    tableStats: {
      tableCount: document.querySelectorAll('table').length,
      rowCount: document.querySelectorAll('tr').length,
      cellCount: document.querySelectorAll('td,th').length,
      selectCount: document.querySelectorAll('select').length,
    },
  };

  return {
    htmlFileName: 'gdipu-timetable-snapshot.html',
    htmlContent,
    debugFileName: 'gdipu-debug.json',
    debugJson: JSON.stringify(debugInfo, null, 2),
  };
}
