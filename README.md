# CampusSchedule / 校园课表助手

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen?logo=nodedotjs&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-12-orange?logo=pnpm&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)

面向高校学生的学期课程表应用：从学校教务系统安全导入个人课表，在本地获得更好的课表体验。数据只保存在用户自己的设备上。

> **声明**：本应用不是任何学校的官方应用。首个适配学校：广东轻工职业技术大学（GDIPU）。

[中文](#中文) | [English](#english)

---

## 中文

### 简介

CampusSchedule（校园课表助手）由两部分组成：

- **Web / PWA 应用**：周课表展示、今日概览、学期管理、导入导出，数据全部保存在浏览器本地（IndexedDB）。
- **浏览器扩展（Chromium MV3）**：在用户**自行登录**的学校教务系统页面中解析个人课表并导出为标准 JSON 文件。

设计原则：用户不需要把学校账号密码交给本应用。扩展只读取已登录课表页面中的课程数据，不读取、不保存账号、密码、验证码、Cookie 和 Token。

### 功能特性

- 📅 **周课表**：网格视图、自动定位当前周、自由切换周次；部分重叠课程错列排布不叠压
- 🕐 **今日概览**：正在上课 / 下一节课 / 今日已结束状态卡片
- 📱 **移动端优先**：手机上默认"今天"纵向时间轴，支持 今天 / 明天 / 本周 切换，主要内容无需横向滚动
- 📖 **课程详情**：课程信息、上课地点、任课教师、周次安排
- 🗓️ **学期管理**：多学期支持、学期切换（持久化）、校历编辑（开学日期 / 总周数）
- ⏰ **作息时间编辑**：按学期配置各节次上下课时间，导入值可人工修正
- ⚠️ **冲突检测**：同时段课程并排显示，并以横幅提示，不丢弃任何课程
- 📥 **JSON 导入（协议 v1）**：导入前预览确认、数据量异常拦截、导入 Diff 统计、警告人话化、文件大小上限
- 📤 **多种导出**：ICS 日历（离散周逐事件生成 + VALARM 提醒）、全量数据备份 JSON、`.campusschedule.json`
- 💾 **备份恢复**：深度校验（版本 / 结构 / 引用完整性）+ 事务式恢复，损坏备份不触碰本地数据
- 🔧 **应用设置持久化**：提醒分钟数、周末列、24 小时制、周起始日，刷新后保持
- 🧩 **浏览器扩展**：学校域名检测、课表页面语义与结构识别、登录页自动禁用、脱敏课表快照生成、调试面板
- 📲 **PWA**：可安装到桌面，支持离线访问；同一构建产物支持根路径与子路径（GitHub Pages）部署
- ✅ **质量保障**：285 个单元测试（Vitest）+ Playwright E2E（根路径与子路径双项目）

### 截图预览

项目当前尚未收录界面截图（后续补充）。应用图标：

<p>
  <img src="apps/web/public/icon.svg" width="96" alt="CampusSchedule 图标" />
</p>

### 环境要求

| 依赖 | 版本要求 | 说明 |
| --- | --- | --- |
| Node.js | >= 20 | 运行构建与测试 |
| pnpm | 12.x | 包管理器（推荐 `corepack enable` 启用，仓库已通过 `packageManager` 字段锁定版本） |
| Chromium 内核浏览器 | Chrome / Edge >= 110 | 安装浏览器扩展 |
| Git | 最新版即可 | 克隆仓库 |

### 安装

```bash
git clone https://github.com/yangxijia111/CampusSchedule.git
cd CampusSchedule
pnpm install        # 安装全部依赖
pnpm build          # 构建全部包（packages → apps）
```

### 使用方法

#### Web 端

1. 构建后用任意静态服务器托管 `apps/web/dist/`，或直接运行 `pnpm --filter @campusschedule/web preview`；
2. 首次打开显示空状态，可点击"体验示例课表"快速了解应用（示例数据不会自动出现，清除全部数据后也不会自动恢复）；
3. 导入真实课表：使用扩展导出 `.campusschedule.json` 文件 → 打开"导入中心"上传 → 预览确认后导入。

#### 浏览器扩展

1. 运行 `pnpm build` 生成 `apps/extension/dist/`（或用 `pnpm package:extension` 打包为 zip）；
2. 打开 `chrome://extensions`，开启"开发者模式"，点击"加载已解压的扩展程序"，选择 `apps/extension/dist/`；
3. 在浏览器中打开学校教务系统并**自行登录**，进入学期课表页面；
4. 页面右下角会出现 CampusSchedule 调试面板：
   - **生成脱敏课表快照** — 输出脱敏 Fixture，用于开发学校适配器；
   - **解析并导出 .campusschedule.json** — GDIPU 解析器完成后可用（当前处于阻塞状态，见 Roadmap）。

### 目录结构

```text
.
├── apps/
│   ├── web/                  # React 19 + Vite PWA：课表展示、导入导出
│   └── extension/            # Chromium Manifest V3 扩展：教务页面课表解析
├── packages/
│   ├── core/                 # 学校无关领域逻辑：课程、学期、周次、节次、冲突、Diff、ICS
│   ├── adapters/             # 学校适配器：GDIPU 检测/快照 + Fixture 回归框架 + Mock 适配器
│   ├── storage/              # IndexedDB（Dexie）本地持久化与备份
│   └── importer-protocol/    # 扩展 ↔ Web 的标准 JSON 导入协议（v1）
├── docs/                     # 产品与技术文档（PRD、架构、数据模型、安全要求、测试计划等）
├── scripts/                  # 构建辅助脚本（扩展打包）
├── tests/
│   └── e2e/                  # Playwright E2E 测试
└── CampusSchedule_App_Docs/  # 早期文档副本（内容与 docs/ 基本一致）
```

### 核心模块说明

| 模块 | 职责 |
| --- | --- |
| `packages/core` | 周次解析引擎（`1-16周`、单双周、逗号离散周、多段范围、中文符号）、节次时间映射、冲突检测、课表 Diff、ICS 导出、稳定 ID 生成 |
| `packages/adapters` | 学校适配器注册表、GDIPU 页面检测（域名 / 语义 / 结构）、登录页识别、脱敏快照生成、Fixture 回归测试框架 |
| `packages/importer-protocol` | `ImportEnvelope` JSON 协议（v1）：Zod Schema 校验、信封构建、URL 脱敏（自动移除 token/ticket/session 等敏感参数，有单元测试覆盖） |
| `packages/storage` | Dexie / IndexedDB 仓库层：学期、课程、设置的本地持久化、备份导出与恢复 |
| `apps/web` | React 19 + Zustand + React Router：今日、本周课表、课程详情、学期管理、导入中心、设置六个页面 |
| `apps/extension` | MV3 扩展：Content Script 页面检测与调试面板、Service Worker、Popup |

### 开发与构建

```bash
pnpm install            # 安装依赖
pnpm build              # 构建全部包
pnpm test               # 运行单元测试（Vitest，285 个用例）
pnpm test:watch         # 监听模式运行单元测试
pnpm test:e2e           # Playwright E2E（首次需 npx playwright install chromium）
pnpm lint               # ESLint 代码检查
pnpm format             # Prettier 格式化
pnpm package:extension  # 打包扩展 zip（输出到 dist/）
```

本地开发 Web 端（热更新）：

```bash
pnpm --filter @campusschedule/web dev
```

部署：`apps/web/dist/` 是纯静态产物，可托管到任意静态服务器或对象存储（GitHub Pages、Vercel、Nginx 等）。PWA 离线能力由内置 Service Worker（`sw.js`）提供。

### 数据与隐私

- 数据默认只保存在用户设备本地（IndexedDB），项目不含任何后端服务；
- 不保存学校账号、密码、验证码、认证 Cookie、Token；
- 快照 / 导入文件中的 URL 自动移除 token、ticket、session 等敏感参数（有单元测试覆盖）；
- 扩展仅申请已确认的学校域名权限（`https://*.gdipu.edu.cn/*`），不使用 `<all_urls>`，不申请 cookies 权限；
- 遇到密码输入页面时，扩展的导入功能自动禁用；
- 常见问题排查见 [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md)，发布检查清单见 [`RELEASE_CHECKLIST.md`](RELEASE_CHECKLIST.md)。

### Roadmap

- [ ] **GDIPU 课表解析器**（当前阻塞：`BLOCKED_BY_REAL_PAGE_FIXTURE`）— 按项目规范，在获得第一份真实登录后课表页面的脱敏快照之前，禁止凭猜测编写选择器。获取快照的步骤见 [`packages/adapters/src/gdipu/fixtures/README.md`](packages/adapters/src/gdipu/fixtures/README.md)
- [ ] 扩展端直接解析并导出个人课表（依赖上一项解锁）
- [ ] 应用内课程提醒 / 站内提醒（开发中）
- [ ] 支持更多高校：欢迎提交新学校的适配需求（Issue）与脱敏快照（PR）

### 贡献

欢迎提交 Issue 和 Pull Request：

1. Fork 仓库并创建功能分支；
2. 提交前请确保 `pnpm lint` 与 `pnpm test` 通过；
3. 涉及学校适配器的改动请遵守 [`docs/04_GDIPU_ADAPTER.md`](docs/04_GDIPU_ADAPTER.md) 与 [`docs/08_AGENT_RULES.md`](docs/08_AGENT_RULES.md) 中的规范：**不得凭猜测编写选择器或接口**，必须基于真实脱敏 Fixture；
4. 请勿在 Issue / PR 中提交包含个人信息的课表数据，一律使用项目提供的脱敏快照功能。

### 许可证

本项目基于 [MIT License](LICENSE) 开源。

### 致谢

- [React](https://react.dev/) · [Vite](https://vite.dev/) · [Zustand](https://github.com/pmndrs/zustand) · [React Router](https://reactrouter.com/)
- [Dexie.js](https://dexie.org/) · [Zod](https://zod.dev/)
- [Vitest](https://vitest.dev/) · [Playwright](https://playwright.dev/) · [TypeScript](https://www.typescriptlang.org/) · [ESLint](https://eslint.org/) · [Prettier](https://prettier.io/)

---

## English

### Overview

CampusSchedule is a semester timetable app for university students. It safely imports your personal timetable from your school's academic affairs system and gives you a better timetable experience, with all data stored locally on your own device.

The project consists of two parts:

- **Web / PWA app**: weekly timetable, today overview, semester management, import & export. All data lives in your browser (IndexedDB).
- **Browser extension (Chromium MV3)**: parses your personal timetable on the academic affairs page **after you log in yourself**, and exports it as a standard JSON file.

Design principle: you never hand your school credentials to this app. The extension only reads course data from the timetable page you have already logged into. It never reads or stores usernames, passwords, captcha, cookies, or tokens.

> **Disclaimer**: this is not an official app of any school. First supported school: Guangdong Industry Polytechnic University (GDIPU).

### Features

- 📅 **Weekly timetable**: grid view, auto-jump to the current week, free week switching; partially overlapping classes laid out side by side without stacking
- 🕐 **Today overview**: status card for "in class" / "next class" / "classes finished"
- 📱 **Mobile-first**: phones default to a vertical "today" timeline with Today / Tomorrow / Week tabs — no horizontal scrolling needed
- 📖 **Course details**: course info, location, teachers, week arrangement
- 🗓️ **Semester management**: multiple semesters, persisted semester switching, calendar editing (start date / total weeks)
- ⏰ **Period times editor**: per-semester class start/end times, editable after import
- ⚠️ **Conflict detection**: overlapping classes shown side by side with a banner; no class is ever dropped
- 📥 **JSON import (protocol v1)**: preview before import, abnormal-data-volume guard, diff statistics, humanized warnings, file size limit
- 📤 **Multiple exports**: ICS calendar (one event per attended week + VALARM reminder), full data backup JSON, `.campusschedule.json`
- 💾 **Backup restore**: deep validation (version / structure / referential integrity) + transactional restore; corrupted backups never touch local data
- 🔧 **Persisted settings**: reminder minutes, weekend columns, 24-hour clock, week start — survive reloads
- 🧩 **Browser extension**: school domain detection, semantic & structural timetable page detection, auto-disable on login pages, sanitized timetable snapshot, debug panel
- 📲 **PWA**: installable, works offline; a single build supports both root-path and sub-path (GitHub Pages) deployment
- ✅ **Quality**: 285 unit tests (Vitest) + Playwright E2E (root & sub-path projects)

### Screenshots

No UI screenshots have been captured yet (coming later). App icon:

<p>
  <img src="apps/web/public/icon.svg" width="96" alt="CampusSchedule icon" />
</p>

### Requirements

| Dependency | Version | Notes |
| --- | --- | --- |
| Node.js | >= 20 | Build & tests |
| pnpm | 12.x | Recommended via `corepack enable`; the repo pins the version through the `packageManager` field |
| Chromium-based browser | Chrome / Edge >= 110 | For the browser extension |
| Git | latest | Clone the repo |

### Installation

```bash
git clone https://github.com/yangxijia111/CampusSchedule.git
cd CampusSchedule
pnpm install        # Install all dependencies
pnpm build          # Build all packages (packages → apps)
```

### Usage

#### Web app

1. Host `apps/web/dist/` with any static server after building, or run `pnpm --filter @campusschedule/web preview`;
2. The app opens with an empty state — click "体验示例课表" to try it with a sample timetable (sample data is never loaded automatically, and it does not come back after wiping all data);
3. To import a real timetable: export `.campusschedule.json` via the extension → open the Import Center → upload → preview → confirm.

#### Browser extension

1. Run `pnpm build` to produce `apps/extension/dist/` (or `pnpm package:extension` for a zip);
2. Open `chrome://extensions`, enable Developer mode, click "Load unpacked", and select `apps/extension/dist/`;
3. Open your school's academic affairs system in the browser, **log in yourself**, and navigate to the semester timetable page;
4. A CampusSchedule debug panel appears at the bottom-right corner:
   - **Generate sanitized snapshot** — produces a sanitized fixture for adapter development;
   - **Parse & export .campusschedule.json** — available once the GDIPU parser ships (currently blocked, see Roadmap).

### Project Structure

```text
.
├── apps/
│   ├── web/                  # React 19 + Vite PWA: timetable UI, import & export
│   └── extension/            # Chromium Manifest V3 extension: on-page timetable parsing
├── packages/
│   ├── core/                 # School-agnostic domain logic: courses, semesters, weeks, periods, conflicts, diff, ICS
│   ├── adapters/             # School adapters: GDIPU detection/snapshot + fixture regression framework + mock adapter
│   ├── storage/              # IndexedDB (Dexie) persistence and backup
│   └── importer-protocol/    # Standard JSON import protocol (v1) between extension and web
├── docs/                     # Product & technical docs (PRD, architecture, data model, security, test plan, ...)
├── scripts/                  # Build helpers (extension packaging)
├── tests/
│   └── e2e/                  # Playwright E2E tests
└── CampusSchedule_App_Docs/  # Early doc copy (mostly identical to docs/)
```

### Core Modules

| Module | Responsibility |
| --- | --- |
| `packages/core` | Week-range parser (`1-16`, odd/even weeks, comma-separated weeks, multi-range, Chinese notation), period-time mapping, conflict detection, timetable diff, ICS export, stable ID generation |
| `packages/adapters` | Adapter registry, GDIPU page detection (domain / semantic / structural), login-page recognition, sanitized snapshot generation, fixture regression framework |
| `packages/importer-protocol` | `ImportEnvelope` JSON protocol (v1): Zod schema validation, envelope building, URL sanitization (strips token/ticket/session query params, unit tested) |
| `packages/storage` | Dexie / IndexedDB repository layer: local persistence of semesters, courses and settings, backup export & restore |
| `apps/web` | React 19 + Zustand + React Router: Today, Weekly Timetable, Course Detail, Semesters, Import Center, Settings |
| `apps/extension` | MV3 extension: content-script page detection & debug panel, service worker, popup |

### Development & Build

```bash
pnpm install            # Install dependencies
pnpm build              # Build all packages
pnpm test               # Run unit tests (Vitest, 285 tests)
pnpm test:watch         # Run unit tests in watch mode
pnpm test:e2e           # Playwright E2E (run npx playwright install chromium first if needed)
pnpm lint               # ESLint
pnpm format             # Prettier
pnpm package:extension  # Package the extension as a zip (into dist/)
```

Develop the web app locally with hot reload:

```bash
pnpm --filter @campusschedule/web dev
```

Deployment: `apps/web/dist/` is a purely static bundle and can be hosted on any static server or object storage (GitHub Pages, Vercel, Nginx, ...). PWA offline support is provided by the bundled service worker (`sw.js`).

### Data & Privacy

- Data is stored locally on your device (IndexedDB) by default; the project has no backend;
- School usernames, passwords, captcha, auth cookies and tokens are never stored;
- URLs in snapshots / import files are automatically stripped of token, ticket and session parameters (unit tested);
- The extension only requests host permissions for the confirmed school domain (`https://*.gdipu.edu.cn/*`) — no `<all_urls>`, no cookies permission;
- The extension's import action is automatically disabled on pages containing password inputs;
- Troubleshooting: [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md); release checklist: [`RELEASE_CHECKLIST.md`](RELEASE_CHECKLIST.md).

### Roadmap

- [ ] **GDIPU timetable parser** (currently `BLOCKED_BY_REAL_PAGE_FIXTURE`) — per project rules, writing selectors based on guesswork is forbidden until the first sanitized snapshot of a real logged-in timetable page is captured. See [`packages/adapters/src/gdipu/fixtures/README.md`](packages/adapters/src/gdipu/fixtures/README.md) for capture steps
- [ ] Direct parse & export of personal timetables in the extension (unblocked by the item above)
- [ ] In-app class reminders (in development)
- [ ] More universities: feel free to open an Issue for a new school adapter or submit sanitized snapshots via PR

### Contributing

Issues and pull requests are welcome:

1. Fork the repo and create a feature branch;
2. Make sure `pnpm lint` and `pnpm test` pass before submitting;
3. Adapter changes must follow the rules in [`docs/04_GDIPU_ADAPTER.md`](docs/04_GDIPU_ADAPTER.md) and [`docs/08_AGENT_RULES.md`](docs/08_AGENT_RULES.md): **never hard-code selectors or APIs based on guesswork** — real sanitized fixtures are required;
4. Never attach timetable data containing personal information to issues or PRs; always use the built-in sanitized snapshot feature.

### License

This project is licensed under the [MIT License](LICENSE).

### Acknowledgements

- [React](https://react.dev/) · [Vite](https://vite.dev/) · [Zustand](https://github.com/pmndrs/zustand) · [React Router](https://reactrouter.com/)
- [Dexie.js](https://dexie.org/) · [Zod](https://zod.dev/)
- [Vitest](https://vitest.dev/) · [Playwright](https://playwright.dev/) · [TypeScript](https://www.typescriptlang.org/) · [ESLint](https://eslint.org/) · [Prettier](https://prettier.io/)
