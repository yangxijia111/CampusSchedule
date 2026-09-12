// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import {
  detectGdipuPage,
  findSemesterTextCandidates,
  isGdipuLocation,
  isLoginPage,
  semanticDetect,
  structureDetect,
} from './detect';
import { sanitizeDomForSnapshot, sanitizeTextFragment } from './snapshot-sanitize';
import { buildTimetableSnapshot } from './snapshot';
import { gdipuAdapter } from './index';

/** 模拟登录后的课表页面（结构与真实教务系统无关，仅测试检测/脱敏逻辑本身）。 */
const TIMETABLE_HTML = `
<div id="header">2026-2027学年第一学期 学生课表查询</div>
<select id="xnxq01"><option value="1">2026-2027学年第一学期</option><option value="2">2026-2027学年第二学期</option></select>
<table id="kbtable">
  <tr><th>节次</th><th>星期一</th><th>星期二</th><th>星期三</th><th>星期四</th><th>星期五</th></tr>
  <tr><td>第1节</td><td>高等数学 1-16周 A101 张三</td><td></td><td></td><td></td><td></td></tr>
  <tr><td>第2节</td><td></td><td>大学英语 1-16周(单) B203 李四</td><td></td><td></td><td></td></tr>
</table>
`;

beforeEach(() => {
  document.head.innerHTML = '<title>学生课表查询</title>';
  document.body.innerHTML = TIMETABLE_HTML;
});

describe('isGdipuLocation', () => {
  it('匹配 GDIPU 域与子域', () => {
    expect(isGdipuLocation(new URL('https://www.gdipu.edu.cn/'))).toBe(true);
    expect(isGdipuLocation(new URL('https://jw.gdipu.edu.cn/timetable'))).toBe(true);
    expect(isGdipuLocation(new URL('https://my.gdipu.edu.cn/portal'))).toBe(true);
  });
  it('不匹配其他域（含伪造后缀）', () => {
    expect(isGdipuLocation(new URL('https://gdipu.edu.cn.evil.com/'))).toBe(false);
    expect(isGdipuLocation(new URL('https://notgdipu.edu.cn/'))).toBe(false);
    expect(isGdipuLocation(new URL('https://www.baidu.com/'))).toBe(false);
  });
});

describe('semanticDetect', () => {
  it('命中课表关键词', () => {
    const result = semanticDetect(document);
    expect(result.matched).toBe(true);
    expect(result.hits).toContain('学生课表');
    expect(result.hits).toContain('课表查询');
  });
  it('普通页面不命中', () => {
    document.head.innerHTML = '<title>学校新闻</title>';
    document.body.innerHTML = '<div>校园活动通知</div>';
    expect(semanticDetect(document).matched).toBe(false);
  });
});

describe('structureDetect', () => {
  it('课表页面：星期表格 + 学期选择器 + 节次文本', () => {
    const result = structureDetect(document);
    expect(result.signals.length).toBeGreaterThanOrEqual(2);
    expect(result.matched).toBe(true);
    expect(result.timetableContainer?.tagName).toBe('TABLE');
  });
  it('非课表页面：无结构信号', () => {
    document.body.innerHTML = '<div>通知</div>';
    const result = structureDetect(document);
    expect(result.matched).toBe(false);
    expect(result.timetableContainer).toBeNull();
  });
});

describe('detectGdipuPage', () => {
  it('课表页面完整命中', () => {
    const result = detectGdipuPage(document, new URL('https://jw.gdipu.edu.cn/kbcx'));
    expect(result.domainMatched).toBe(true);
    expect(result.semanticMatched).toBe(true);
    expect(result.structureMatched).toBe(true);
    expect(result.isLoginPage).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
  it('登录页：不解析', () => {
    document.body.innerHTML =
      '<input type="text" name="username"><input type="password" name="password"><button>登录</button>';
    const result = detectGdipuPage(document, new URL('https://auth.gdipu.edu.cn/login'));
    expect(result.isLoginPage).toBe(true);
    expect(isLoginPage(document)).toBe(true);
  });
});

describe('findSemesterTextCandidates', () => {
  it('找到包含"学年/学期"的文本片段', () => {
    const candidates = findSemesterTextCandidates(document);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.some((c) => c.includes('学年') || c.includes('学期'))).toBe(true);
  });
});

describe('sanitizeDomForSnapshot', () => {
  it('移除脚本与密码框，清除表单值', () => {
    document.body.innerHTML = `
      <div id="wrap">
        <script>var token = 'SECRET_TOKEN';</script>
        <input type="text" id="kw" value="敏感输入">
        <input type="password" id="pw" value="never">
        <span data-user-id="12345">张三</span>
        <span>学号：202312345678</span>
      </div>`;
    const html = sanitizeDomForSnapshot(document.getElementById('wrap')!);
    expect(html).not.toContain('SECRET_TOKEN');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('password');
    expect(html).not.toContain('value=');
    expect(html).not.toContain('data-user-id');
    expect(html).toContain('[STUDENT_ID]');
    expect(html).toContain('张三'); // 姓名保留，由用户预览把关
  });
  it('移除事件属性', () => {
    document.body.innerHTML = '<div onclick="steal()" onmouseover="x()">内容</div>';
    const html = sanitizeDomForSnapshot(document.body);
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('onmouseover');
  });
  it('sanitizeTextFragment 脱敏长数字串', () => {
    expect(sanitizeTextFragment('电话 13800138000')).not.toContain('13800138000');
    expect(sanitizeTextFragment('教室 A101')).toBe('教室 A101');
    expect(sanitizeTextFragment('2026-2027学年')).toBe('2026-2027学年');
  });
});

describe('buildTimetableSnapshot', () => {
  it('生成脱敏 HTML 与调试 JSON', () => {
    const detection = detectGdipuPage(document, new URL('https://jw.gdipu.edu.cn/kbcx?token=SECRETTOKEN123'));
    const snapshot = buildTimetableSnapshot(document, new URL('https://jw.gdipu.edu.cn/kbcx?token=SECRETTOKEN123'), detection);
    expect(snapshot.htmlFileName).toBe('gdipu-timetable-snapshot.html');
    expect(snapshot.debugFileName).toBe('gdipu-debug.json');
    // URL 脱敏
    expect(snapshot.debugJson).not.toContain('SECRETTOKEN123');
    expect(snapshot.debugJson).toContain('jw.gdipu.edu.cn');
    // HTML 为完整文档且包含课表表格
    expect(snapshot.htmlContent).toContain('<!doctype html>');
    expect(snapshot.htmlContent).toContain('kbtable');
    // 调试信息含 adapter 版本与检测结论
    const debug = JSON.parse(snapshot.debugJson);
    expect(debug.adapterId).toBe('gdipu');
    expect(debug.detection.structureMatched).toBe(true);
    expect(debug.tableStats.tableCount).toBe(1);
  });
});

describe('gdipuAdapter 解析边界', () => {
  it('无真实 Fixture 前解析必须显式失败（BLOCKED_BY_REAL_PAGE_FIXTURE）', () => {
    const semesterResult = gdipuAdapter.parseSemesterContext(document);
    expect(semesterResult.ok).toBe(false);
    if (!semesterResult.ok) {
      expect(semesterResult.error.code).toBe('BLOCKED_BY_REAL_PAGE_FIXTURE');
    }
    const timetableResult = gdipuAdapter.parseTimetable(document, {
      semester: {
        id: 'x',
        schoolId: 'gdipu',
        academicYear: '2026-2027',
        term: 1,
        displayName: 'x',
      },
    });
    expect(timetableResult.ok).toBe(false);
    if (!timetableResult.ok) {
      expect(timetableResult.error.code).toBe('BLOCKED_BY_REAL_PAGE_FIXTURE');
    }
  });

  it('matchLocation 只认 GDIPU 域', () => {
    expect(gdipuAdapter.matchLocation(new URL('https://jw.gdipu.edu.cn/'))).toBe(true);
    expect(gdipuAdapter.matchLocation(new URL('https://jw.other.edu.cn/'))).toBe(false);
  });
});
