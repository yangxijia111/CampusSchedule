import { describe, expect, it } from 'vitest';
import { listSensitiveUrlParams, sanitizePageUrl } from './url-sanitizer';

describe('sanitizePageUrl', () => {
  it('普通 URL 原样保留', () => {
    expect(sanitizePageUrl('https://jw.gdipu.edu.cn/timetable?id=5')).toBe(
      'https://jw.gdipu.edu.cn/timetable?id=5',
    );
  });

  it.each([
    ['token', 'https://s.edu/a?token=abc123'],
    ['ticket', 'https://s.edu/a?ticket=ST-12345'],
    ['session', 'https://s.edu/a?session=xyz'],
    ['jsessionid', 'https://s.edu/a;jsessionid=ABC123?x=1'],
    ['code', 'https://s.edu/a?code=0oUfS9'],
    ['sid', 'https://s.edu/a?sid=99'],
    ['auth', 'https://s.edu/a?auth=bearer'],
    ['access_token（包含匹配）', 'https://s.edu/a?access_token=xyz'],
  ])('移除敏感参数：%s', (_name, url) => {
    const sanitized = sanitizePageUrl(url);
    expect(sanitized).not.toMatch(/token|ticket|session|jsessionid|sid=|auth|code/i);
  });

  it('移除高熵随机值参数（≥20 位字母数字混合）', () => {
    const url = 'https://s.edu/a?state=Ab12Cd34Ef56Gh78Ij90&keep=1';
    expect(sanitizePageUrl(url)).toBe('https://s.edu/a?keep=1');
  });

  it('保留中文长参数（非高熵随机）', () => {
    const url = 'https://s.edu/a?name=' + encodeURIComponent('张三丰的技术学院课程');
    expect(sanitizePageUrl(url)).toContain('name=');
  });

  it('移除 hash 中的敏感参数', () => {
    expect(sanitizePageUrl('https://s.edu/a#token=secret123')).toBe('https://s.edu/a');
    expect(sanitizePageUrl('https://s.edu/a#page=2')).toBe('https://s.edu/a#page=2');
  });

  it('非法 URL 返回占位', () => {
    expect(sanitizePageUrl('not a url')).toBe('(invalid-url)');
  });

  it('listSensitiveUrlParams 只列参数名不含值', () => {
    expect(listSensitiveUrlParams('https://s.edu/a?token=SECRET&keep=1')).toEqual(['token']);
  });
});
