import { describe, expect, it } from 'vitest';
import {
  normalizeFullWidthPunctuation,
  normalizeLocation,
  normalizeTeacherNames,
  normalizeWhitespace,
  normalizeWeekText,
} from './normalize';

describe('normalizeWhitespace', () => {
  it('折叠连续空白为单空格', () => {
    expect(normalizeWhitespace('a  b\t\tc')).toBe('a b c');
  });
  it('全角空格也视为空白', () => {
    expect(normalizeWhitespace('a\u3000\u3000b')).toBe('a b');
  });
  it('换行折叠', () => {
    expect(normalizeWhitespace('第一行\n第二行')).toBe('第一行 第二行');
  });
  it('去除首尾空白', () => {
    expect(normalizeWhitespace('  hello  ')).toBe('hello');
  });
  it('空字符串保持为空', () => {
    expect(normalizeWhitespace('   ')).toBe('');
  });
});

describe('normalizeFullWidthPunctuation', () => {
  it('全角括号转半角', () => {
    expect(normalizeFullWidthPunctuation('（单）')).toBe('(单)');
  });
  it('中文逗号/顿号转半角逗号', () => {
    expect(normalizeFullWidthPunctuation('1，2、3')).toBe('1,2,3');
  });
  it('全角冒号分号转半角', () => {
    expect(normalizeFullWidthPunctuation('周一：上午；下午')).toBe('周一:上午;下午');
  });
  it('普通文字不受影响', () => {
    expect(normalizeFullWidthPunctuation('高等数学A101')).toBe('高等数学A101');
  });
});

describe('normalizeTeacherNames', () => {
  it('斜杠分隔', () => {
    expect(normalizeTeacherNames('张三/李四')).toEqual(['张三', '李四']);
  });
  it('中文顿号分隔', () => {
    expect(normalizeTeacherNames('张三、李四')).toEqual(['张三', '李四']);
  });
  it('混合分隔符', () => {
    expect(normalizeTeacherNames('张三,李四；王五/赵六')).toEqual(['张三', '李四', '王五', '赵六']);
  });
  it('过滤空项', () => {
    expect(normalizeTeacherNames(' , ,张三, ')).toEqual(['张三']);
  });
  it('空输入返回空数组', () => {
    expect(normalizeTeacherNames('')).toEqual([]);
  });
  it('单人姓名', () => {
    expect(normalizeTeacherNames(' 欧阳娜娜 ')).toEqual(['欧阳娜娜']);
  });
});

describe('normalizeLocation / normalizeWeekText', () => {
  it('地点归一化保留内部结构', () => {
    expect(normalizeLocation(' 教学楼 \n A101 ')).toBe('教学楼 A101');
  });
  it('周次文本移除全部空白', () => {
    expect(normalizeWeekText(' 1 - 16 周 ( 单 ) ')).toBe('1-16周(单)');
  });
  it('周次文本全角标点转半角', () => {
    expect(normalizeWeekText('1-16周（单）')).toBe('1-16周(单)');
  });
});
