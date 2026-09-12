import { registerBuiltinAdapters, resolveAdapter, buildTimetableSnapshot } from '@campusschedule/adapters';
import type { PageDetectionResult } from '@campusschedule/adapters';
import { buildImportEnvelope, envelopeFileName, envelopeToFileContent } from '@campusschedule/importer-protocol';
import type { ContentStatusMessage, ExtensionMessage } from '../messages';

/**
 * Content Script（在用户已登录的学校页面中运行）。
 *
 * 安全约束：
 * - detectPage 只做结构存在性检查，不读取任何 input 的 value（包括密码框）；
 * - 快照生成只在用户点击 Debug Panel 按钮后执行，且结果先预览再下载；
 * - 快照导出前经过脱敏（脚本/表单值/事件属性/学号）。
 */

registerBuiltinAdapters();

interface DetectionState {
  adapterId: string | null;
  schoolName: string | null;
  detection: PageDetectionResult | null;
}

/** 检测当前页面（不读取任何表单值）。 */
function detect(): DetectionState & ContentStatusMessage {
  const adapter = resolveAdapter(window.location);
  if (!adapter) {
    return { type: 'content-status', adapterId: null, schoolName: null, detection: null };
  }
  const detection = adapter.detectPage(document, window.location);
  return {
    type: 'content-status',
    adapterId: adapter.id,
    schoolName: adapter.displayName,
    detection,
  };
}

/** ===== Debug Panel（Shadow DOM 隔离，不污染学校页面样式） ===== */

function createDebugPanel(state: DetectionState): void {
  const host = document.createElement('div');
  host.id = 'campusschedule-debug-panel';
  host.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483646;';
  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    .panel {
      width: 320px; background:#fff; border:1px solid #e5e7eb; border-radius:12px;
      box-shadow:0 4px 16px rgba(0,0,0,.14); font:13px/1.5 'PingFang SC','Microsoft YaHei',system-ui,sans-serif;
      color:#1f2430; padding:12px;
    }
    .panel h1 { font-size:14px; margin:0 0 8px; }
    .row { display:flex; gap:6px; align-items:center; margin:2px 0; }
    .dot { width:8px; height:8px; border-radius:50%; background:#d1d5db; flex-shrink:0; }
    .dot.on { background:#059669; }
    .dot.warn { background:#d97706; }
    button {
      margin-top:8px; width:100%; border:0; border-radius:8px; padding:8px 0; font-size:13px;
      background:#4f46e5; color:#fff; cursor:pointer;
    }
    button:disabled { background:#c7d2fe; cursor:not-allowed; }
    .preview {
      margin-top:8px; max-height:180px; overflow:auto; background:#f9fafb;
      border:1px solid #e5e7eb; border-radius:8px; padding:8px; font-size:12px; white-space:pre-wrap;
    }
    .muted { color:#6b7280; font-size:12px; }
  `;
  shadow.append(style);

  const panel = document.createElement('div');
  panel.className = 'panel';

  const title = document.createElement('h1');
  title.textContent = 'CampusSchedule 调试面板';
  panel.append(title);

  const detection = state.detection;
  const rows: Array<{ on: boolean; warn?: boolean; text: string }> = [
    { on: detection?.domainMatched ?? false, text: '学校域名（*.gdipu.edu.cn）' },
    { on: detection?.semanticMatched ?? false, text: '页面语义（课表关键词）' },
    { on: detection?.structureMatched ?? false, text: '页面结构（星期/节次/学期）' },
    {
      on: !detection?.isLoginPage,
      warn: detection?.isLoginPage,
      text: detection?.isLoginPage ? '登录页（禁止解析，请先自行登录）' : '非登录页',
    },
  ];
  for (const row of rows) {
    const rowEl = document.createElement('div');
    rowEl.className = 'row';
    const dot = document.createElement('span');
    dot.className = 'dot' + (row.on ? ' on' : row.warn ? ' warn' : '');
    const label = document.createElement('span');
    label.textContent = row.text;
    rowEl.append(dot, label);
    panel.append(rowEl);
  }

  const snapshotButton = document.createElement('button');
  snapshotButton.textContent = '生成脱敏课表快照';
  snapshotButton.disabled = !state.adapterId || detection?.isLoginPage === true;
  panel.append(snapshotButton);

  const exportButton = document.createElement('button');
  exportButton.textContent = '解析并导出 .campusschedule.json';
  exportButton.disabled = !state.adapterId || detection?.isLoginPage === true;
  panel.append(exportButton);

  const errorArea = document.createElement('div');
  errorArea.className = 'preview';
  errorArea.hidden = true;
  panel.append(errorArea);

  const previewArea = document.createElement('div');
  previewArea.className = 'preview';
  previewArea.hidden = true;
  panel.append(previewArea);

  const confirmButton = document.createElement('button');
  confirmButton.textContent = '确认并下载快照文件';
  confirmButton.hidden = true;
  panel.append(confirmButton);

  const hint = document.createElement('div');
  hint.className = 'muted';
  hint.textContent = '快照已自动移除脚本、表单值、事件属性与学号；请预览确认后再下载。';
  panel.append(hint);

  shadow.append(panel);
  document.body.append(host);

  let pendingSnapshot: { htmlContent: string; debugJson: string; htmlFileName: string; debugFileName: string } | null = null;

  snapshotButton.addEventListener('click', () => {
    if (!state.adapterId) return;
    const adapter = resolveAdapter(window.location);
    if (!adapter) return;
    const current = adapter.detectPage(document, window.location);
    const snapshot = buildTimetableSnapshot(document, window.location, current);
    pendingSnapshot = snapshot;
    // 预览：脱敏 URL + 标题 + 表格统计 + HTML 前 600 字符
    const debug = JSON.parse(snapshot.debugJson);
    previewArea.textContent = [
      '来源：' + debug.pageUrl,
      '标题：' + debug.pageTitle,
      '表格：' + debug.tableStats.tableCount + ' 个 / ' + debug.tableStats.rowCount + ' 行',
      '学期候选：' + (debug.semesterTextCandidates.slice(0, 3).join(' | ') || '（无）'),
      '--- 脱敏 HTML 预览（前 600 字符）---',
      snapshot.htmlContent.slice(0, 600) + '…',
    ].join('\n');
    previewArea.hidden = false;
    confirmButton.hidden = false;
  });

  confirmButton.addEventListener('click', () => {
    if (!pendingSnapshot) return;
    downloadText(pendingSnapshot.htmlFileName, pendingSnapshot.htmlContent, 'text/html');
    downloadText(pendingSnapshot.debugFileName, pendingSnapshot.debugJson, 'application/json');
    confirmButton.textContent = '已下载 ✅（文件请在下载目录查找）';
    confirmButton.disabled = true;
  });

  /** 解析并导出标准导入信封（用户主动点击后才开始解析）。 */
  let pendingEnvelopeFile: { fileName: string; content: string } | null = null;
  const exportConfirmButton = document.createElement('button');
  exportConfirmButton.textContent = '确认下载导入文件';
  exportConfirmButton.hidden = true;
  panel.append(exportConfirmButton);

  exportButton.addEventListener('click', () => {
    errorArea.hidden = true;
    const adapter = resolveAdapter(window.location);
    if (!adapter) return;

    const semesterResult = adapter.parseSemesterContext(document);
    if (!semesterResult.ok) {
      showAdapterError('学期解析失败', semesterResult.error.code, semesterResult.error.message);
      return;
    }
    const timetableResult = adapter.parseTimetable(document, {
      semester: semesterResult.data,
    });
    if (!timetableResult.ok) {
      showAdapterError('课表解析失败', timetableResult.error.code, timetableResult.error.message);
      return;
    }

    const envelope = buildImportEnvelope({
      schoolId: adapter.id,
      adapterVersion: adapter.version,
      pageUrl: window.location.href,
      semester: timetableResult.data.semester,
      courses: timetableResult.data.courses,
      warnings: timetableResult.warnings,
    });
    if (!envelope.ok) {
      showAdapterError('数据校验失败', 'INVALID_ENVELOPE', envelope.error);
      return;
    }

    const sessionCount = envelope.envelope.courses.reduce(
      (sum, course) => sum + course.sessions.length,
      0,
    );
    // 导入预览：学期 / 课程数 / Session 数 / 警告数
    previewArea.textContent = [
      '学校：' + adapter.displayName,
      '学期：' + envelope.envelope.semester.displayName,
      '课程：' + envelope.envelope.courses.length + ' 门',
      '上课时段：' + sessionCount + ' 个',
      '警告：' + envelope.envelope.warnings.length + ' 条',
      envelope.envelope.warnings
        .slice(0, 3)
        .map((w) => '  - [' + w.code + '] ' + w.message)
        .join('\n'),
      '',
      '确认后请在 CampusSchedule Web「导入中心」上传该文件。',
    ].join('\n');
    previewArea.hidden = false;

    pendingEnvelopeFile = {
      fileName: envelopeFileName(envelope.envelope),
      content: envelopeToFileContent(envelope.envelope),
    };
    exportConfirmButton.hidden = false;
    exportConfirmButton.disabled = false;
    exportConfirmButton.textContent = '确认下载导入文件';
  });

  exportConfirmButton.addEventListener('click', () => {
    if (!pendingEnvelopeFile) return;
    downloadText(pendingEnvelopeFile.fileName, pendingEnvelopeFile.content, 'application/json');
    exportConfirmButton.textContent = '已下载 ✅ 请到 Web 端导入中心上传';
    exportConfirmButton.disabled = true;
  });

  function showAdapterError(title: string, code: string, message: string): void {
    const hint =
      code === 'BLOCKED_BY_REAL_PAGE_FIXTURE'
        ? '\n当前学校适配器尚未适配真实页面。\n请先点击"生成脱敏课表快照"，把快照提供给开发者完成适配。'
        : '\n教务页面结构可能与本适配器版本不一致，请更新扩展或生成脱敏快照反馈。';
    errorArea.textContent = title + ' [' + code + ']\n' + message + hint;
    errorArea.hidden = false;
  }
}

/** 在用户点击后才触发的文件下载。 */
function downloadText(fileName: string, text: string, mimeType: string): void {
  const blob = new Blob([text], { type: mimeType + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** ===== 消息入口（popup 查询） ===== */

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message.type === 'popup-query-status') {
    sendResponse(detect());
  }
  return false;
});

// 注入 Debug Panel（仅当命中已注册适配器的域）
const initialState = detect();
if (initialState.adapterId && document.body) {
  createDebugPanel(initialState);
}
