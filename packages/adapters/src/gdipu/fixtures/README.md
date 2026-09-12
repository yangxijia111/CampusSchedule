# GDIPU 真实课表快照（Fixture）目录

本目录当前为空：**尚未获得任何真实 GDIPU 课表页面快照**。

## 为什么不能先写 Parser

按 `docs/04_GDIPU_ADAPTER.md` 与 `docs/08_AGENT_RULES.md` 的要求，
在拿到真实脱敏快照之前，GDIPU 适配器的课表解析保持：

```text
BLOCKED_BY_REAL_PAGE_FIXTURE
```

禁止凭猜测写死接口或选择器。

## 如何获得快照

1. 安装开发版扩展（`apps/extension/dist/`，浏览器"加载已解压的扩展程序"）；
2. 自己打开广东轻工职业技术大学教务系统并登录（扩展不接触账号/密码/验证码）；
3. 进入"学期课表"页面；
4. 点击页面右下角 CampusSchedule 调试面板中的"生成脱敏课表快照"；
5. 预览确认脱敏结果后下载两个文件；
6. 将 `gdipu-timetable-snapshot.html` 放入本目录，命名建议：
   - `semester-2026-fall.html`
   - `timetable-normal.html`
   - `timetable-odd-even.html`（含单双周）
   - `timetable-practical.html`（含实训课）
   - `timetable-empty.html`（空课表）
7. 配套 `*.expected.json`（期望解析结果），加入 `fixture-runner` 回归。

拿到快照后，即可在 `src/gdipu/` 下实现具体 Parser（Phase 7 解锁）。
