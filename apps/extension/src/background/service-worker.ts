/**
 * Service Worker（MV3 background）。
 * 当前职责：安装日志。消息在 popup ↔ content script 间直接传递，不经过 SW。
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.info('[CampusSchedule] 扩展已' + (details.reason === 'install' ? '安装' : '更新'), {
    reason: details.reason,
    version: chrome.runtime.getManifest().version,
  });
});
