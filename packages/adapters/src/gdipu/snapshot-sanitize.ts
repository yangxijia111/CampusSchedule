/**
 * 快照脱敏（05 安全要求 §8）。
 *
 * 快照在离开页面前必须完成以下清理：
 * - 移除 script / style / iframe / object / embed / link / meta / form 等标签；
 * - 移除全部表单元素的 value 与内容，删除密码框；
 * - 移除事件属性与个人标识类 data-* 属性；
 * - 文本中的学号（8-12 位连续数字）替换为 [STUDENT_ID]。
 *
 * 生成后必须让用户预览确认：姓名等无法可靠自动识别的信息由人工把关。
 */

/** 一律删除的标签。 */
const STRIP_TAGS = 'script, style, noscript, iframe, frame, object, embed, link, meta, base, form, svg';

/** 8-12 位连续数字视为学号候选（电话号码同样会被脱敏，宁可多脱）。 */
const STUDENT_ID_PATTERN = /\d{8,12}/g;

/** 个人标识类 data-* 属性（小写前缀匹配）。 */
const PERSONAL_DATA_ATTR = /^data-(user|student|xh|uid|id|account|username|realname|name|phone|mobile|email)/;

/** 克隆并脱敏一个 DOM 子树，返回其 outerHTML。 */
export function sanitizeDomForSnapshot(root: Element): string {
  const clone = root.cloneNode(true) as Element;
  cleanAttributes(clone);
  cleanSubtree(clone);
  return clone.outerHTML;
}

/** 脱敏纯文本（用于 debug.json 中的学期候选等）。 */
export function sanitizeTextFragment(text: string): string {
  return text.replace(STUDENT_ID_PATTERN, '[STUDENT_ID]');
}

/** 清理单个元素自身的属性。 */
function cleanAttributes(element: Element): void {
  for (const attr of [...element.attributes]) {
    const name = attr.name.toLowerCase();
    if (name.startsWith('on') || name === 'value' || name === 'srcdoc' || PERSONAL_DATA_ATTR.test(name)) {
      element.removeAttribute(attr.name);
    }
  }
}

/** 递归清理子树：删标签 → 删密码框 → 清属性 → 清表单内容 → 脱敏文本。 */
function cleanSubtree(root: Element): void {
  for (const bad of [...root.querySelectorAll(STRIP_TAGS)]) {
    bad.remove();
  }
  for (const passwordInput of [...root.querySelectorAll('input[type="password"]')]) {
    passwordInput.remove();
  }
  for (const element of [root, ...root.querySelectorAll('*')]) {
    cleanAttributes(element);
    if (element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA') {
      element.textContent = '';
    }
    for (const textNode of element.childNodes) {
      if (textNode.nodeType === Node.TEXT_NODE && textNode.textContent) {
        textNode.textContent = sanitizeTextFragment(textNode.textContent);
      }
    }
  }
}
