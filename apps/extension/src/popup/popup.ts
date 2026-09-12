import type { ContentStatusMessage } from '../messages';
import { activeTab, sendTabMessage } from '../messaging';

/**
 * Popup 状态展示。全部状态在 popup.html 中预置，
 * 脚本只负责切换显示与填充纯文本，不拼接任何 HTML。
 */

const statusBox = document.querySelector('#status')!;
const panes = [...statusBox.querySelectorAll('[data-pane]')];
const schoolFields = [...document.querySelectorAll('[data-field="school"]')];
const reasonsField = document.querySelector('[data-field="reasons"]')!;

type StatusKind = 'off' | 'ok' | 'warn';

function showPane(name: string, kind: StatusKind): void {
  statusBox.setAttribute('data-kind', kind);
  for (const pane of panes) {
    pane.toggleAttribute('hidden', pane.getAttribute('data-pane') !== name);
  }
}

function setSchoolName(name: string): void {
  for (const field of schoolFields) {
    field.textContent = name;
  }
}

function setReasons(reasons: string[]): void {
  const items = reasons.map((reason) => {
    const item = document.createElement('li');
    item.textContent = reason;
    return item;
  });
  reasonsField.replaceChildren(...items);
}

async function main() {
  const tab = await activeTab();
  if (!tab?.id) {
    showPane('notab', 'off');
    return;
  }

  const response = await sendTabMessage<ContentStatusMessage>(tab.id, {
    type: 'popup-query-status',
  });

  if (!response || response.type !== 'content-status' || !response.adapterId) {
    showPane('off', 'off');
    return;
  }

  setSchoolName(response.schoolName ?? response.adapterId);
  const detection = response.detection;

  if (detection?.isLoginPage) {
    showPane('login', 'warn');
    return;
  }

  if (detection?.semanticMatched && detection.structureMatched) {
    showPane('ok', 'ok');
    return;
  }

  setReasons(detection?.reasons ?? []);
  showPane('warn', 'warn');
}

void main();
