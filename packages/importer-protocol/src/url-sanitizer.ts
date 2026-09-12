/**
 * URL 脱敏（05 安全要求 §7）。
 *
 * 保存/导出任何来源 URL 前必须调用：
 * - 删除 query 中的 token / ticket / code / session / sid / auth 等敏感参数；
 * - 删除高熵随机值参数（长随机串，可能为会话标识）；
 * - 清空包含敏感参数的 hash。
 */

/** 已知敏感 query 参数名（小写，包含匹配）。 */
const SENSITIVE_KEY_PATTERNS = [
  'token',
  'ticket',
  'session',
  'jsessionid',
  'sid',
  'auth',
  'password',
  'passwd',
  'secret',
  'key',
  'sign',
  'captcha',
  'verify',
  'code',
];

/** 高熵值：≥20 字符且同时含字母与数字的随机样串。 */
function looksHighEntropy(value: string): boolean {
  if (value.length < 20) return false;
  return /[a-z]/i.test(value) && /\d/.test(value) && !/[\u4e00-\u9fa5]/.test(value);
}

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_PATTERNS.some((pattern) => lower.includes(pattern));
}

function hashLooksSensitive(hash: string): boolean {
  if (hash.length <= 1) return false;
  const lower = hash.toLowerCase();
  return SENSITIVE_KEY_PATTERNS.some((pattern) => lower.includes(pattern));
}

/** 解析 path 参数段（a=1;b=2），返回敏感参数名。 */
function listSensitivePathParams(pathParams: string): string[] {
  const keys: string[] = [];
  for (const pair of pathParams.split(';')) {
    const key = pair.split('=')[0] ?? '';
    if (key && isSensitiveKey(key)) {
      keys.push(key);
    }
  }
  return keys;
}

/** 返回脱敏后的 URL 字符串；无法解析时返回安全占位。 */
export function sanitizePageUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return '(invalid-url)';
  }

  const removedKeys: string[] = [];
  for (const key of [...url.searchParams.keys()]) {
    const value = url.searchParams.get(key) ?? '';
    if (isSensitiveKey(key) || looksHighEntropy(value)) {
      url.searchParams.delete(key);
      removedKeys.push(key);
    }
  }

  // 路径参数（如 /a;jsessionid=ABC123）：JSESSIONID 常出现在 path 中
  const semicolonIndex = url.pathname.indexOf(';');
  if (semicolonIndex !== -1) {
    const pathParams = url.pathname.slice(semicolonIndex + 1);
    url.pathname = url.pathname.slice(0, semicolonIndex);
    removedKeys.push(...listSensitivePathParams(pathParams));
  }

  if (hashLooksSensitive(url.hash)) {
    url.hash = '';
  }

  // 无 query 且无 hash 时，URL 结尾可能残留 "?"，清理之
  let result = url.toString();
  if (url.search === '' && result.endsWith('?')) {
    result = result.slice(0, -1);
  }
  return result;
}

/** 记录被移除的参数名（调试用，不含参数值）。 */
export function listSensitiveUrlParams(rawUrl: string): string[] {
  try {
    const url = new URL(rawUrl);
    const keys: string[] = [];
    for (const key of [...url.searchParams.keys()]) {
      const value = url.searchParams.get(key) ?? '';
      if (isSensitiveKey(key) || looksHighEntropy(value)) {
        keys.push(key);
      }
    }
    return keys;
  } catch {
    return [];
  }
}
