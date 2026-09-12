# 06 — Phase 0~10 开发计划

> Agent 必须逐 Phase 开发、验证、汇报。不得一口气生成未经测试的“完整项目”。

---

# Phase 0 — 工程初始化

## 目标

建立 Monorepo 和基础工具链。

## 工作

- pnpm workspace
- TypeScript
- apps/web
- apps/extension
- packages/core
- packages/adapters
- packages/storage
- ESLint
- Prettier
- Vitest

## 验收

- `pnpm install`
- `pnpm build`
- `pnpm test`
- 全部通过。

---

# Phase 1 — Core Data Model

## 目标

建立学校、学期、课程、Session、周次模型。

## 工作

实现：

- Semester
- Course
- CourseSession
- ImportEnvelope
- ImportWarning
- Zod schema

## 测试

错误 JSON 必须验证失败。

---

# Phase 2 — Week & Period Engine

## 目标

完成最容易出错的周次/节次解析。

## 工作

支持：

- 1-16周
- 单周
- 双周
- 逗号离散周
- 多段范围
- 中文符号
- 空格

## 测试

至少 30 个 unit tests。

---

# Phase 3 — PWA 基础界面

## 目标

不用学校数据，先用 Fixture 做完整课表 UI。

## 页面

- 首页
- 周课表
- 课程详情
- 学期管理
- 导入中心
- 设置

## 验收

使用 Mock Timetable 可以完整显示。

---

# Phase 4 — Local Storage

## 目标

IndexedDB 持久化。

## 工作

- Dexie
- 保存 Semester
- 保存 Courses
- 保存 Import History
- JSON 导入/导出

## 验收

刷新页面数据不丢失。

---

# Phase 5 — Browser Extension Skeleton

## 目标

建立 Manifest V3 扩展。

## 工作

- service worker
- content script
- popup
- school detector
- adapter registry

## 安全要求

- 不申请 cookies 权限；
- 不读取 password input；
- 不使用 `<all_urls>`。

---

# Phase 6 — GDIPU Detection & Debug Snapshot

## 目标

先识别真实 GDIPU 页面，不急着写 Parser。

## 工作

- GDIPU 域检测；
- 页面语义检测；
- Debug Panel；
- 脱敏 Snapshot 导出。

## 验收

用户登录后能在课表页面生成可用于开发的脱敏 Fixture。

---

# Phase 7 — GDIPU Parser

## 前置条件

必须有真实 Snapshot。

没有真实 Snapshot：

**停止实现具体 selector，不得猜。**

## 工作

- semester parser
- timetable grid parser
- teacher parser
- location parser
- week parser integration
- session grouping

## 测试

所有 Snapshot 加入 Fixture Test。

---

# Phase 8 — Import Workflow

## 目标

完成扩展 → App 导入。

首版采用 JSON 文件协议。

## 工作

扩展：

- Parse
- Preview
- Validate
- Export JSON

Web：

- Import JSON
- Preview
- Confirm
- Save

## 验收

真实 GDIPU 课表能够进入 App。

---

# Phase 9 — Timetable Intelligence

## 工作

- 当前教学周；
- 本周课程；
- 下一节课；
- 冲突检测；
- 周次过滤；
- 重新导入 Diff；
- ICS 导出。

## 验收

跨周切换正确。

---

# Phase 10 — Product Polish & Release

## 工作

- PWA manifest
- install prompt
- error boundary
- empty states
- dark mode
- responsive
- accessibility
- production build
- extension zip
- README
- privacy notice
- troubleshooting

## 最终验证

- Web Build
- Extension Build
- Unit Test
- E2E Test
- 手工导入真实 GDIPU 课表
- 安全检查
- 权限检查

## 最终交付

```text
dist/web/
dist/extension/
docs/
README.md
RELEASE_CHECKLIST.md
```
