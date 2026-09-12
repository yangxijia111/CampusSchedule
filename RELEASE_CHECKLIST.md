# CampusSchedule 发布检查清单

> 版本：0.1.0（MVP）· 日期：2026-09-09

## 1. 构建产物

```bash
pnpm install
pnpm build                    # 全部包构建（web + extension + 4 个 packages）
pnpm package:extension        # 生成 dist/extension/campusschedule-importer.zip
```

产物：

- `apps/web/dist/` — PWA 静态资源（部署到任意静态托管）
- `apps/extension/dist/` — 未打包扩展目录（开发者模式加载）
- `dist/extension/campusschedule-importer.zip` — 扩展发布包

## 2. 测试

```bash
pnpm test          # 单元测试（模型/周次/节次/检测/脱敏/存储/Diff/ICS/冲突）
pnpm lint          # ESLint
pnpm test:e2e      # Playwright E2E（需要先 npx playwright install chromium）
```

## 3. 安全检查（发布前必做）

- [x] 扩展 manifest 无 `<all_urls>`（仅 `https://*.gdipu.edu.cn/*`）
- [x] 扩展 manifest 无 `cookies` 权限（仅 `storage`）
- [x] 源码无 password input 读取（detectPage 只检查存在性，快照脱敏删除密码框与全部表单值）
- [x] 无 token/cookie/session 持久化（URL 脱敏有单测覆盖：query/path/hash 三处）
- [x] 快照 sanitizer 有测试（脚本/样式/表单值/事件属性/学号脱敏）
- [x] URL sanitizer 有测试
- [x] 扩展构建脚本内置 manifest 安全自检（命中即构建失败）
- [x] Web 端不做任何跨域请求；数据仅存 IndexedDB

## 4. 功能验证（手工）

- [x] PWA：manifest + Service Worker + 安装提示（生产构建）
- [x] 首次打开自动加载示例课表；刷新不丢数据
- [x] 周课表：切换周、单双周正确（第 2 周无大学英语周三课、有周五课）
- [x] 离散周正确（思政课第 9 周不显示；Web 实训仅 1-4 周）
- [x] 课程详情：周次压缩文本、地点缺失警告
- [x] 冲突标记：同时段两门课并排显示 ⚠ + 顶部横幅
- [x] ICS 导出：离散周逐事件展开、含 VALARM、缺作息时段跳过并说明
- [x] JSON 导入：校验失败显式报错；数据量异常需勾选确认才能覆盖；导入历史落库
- [x] 扩展：GDIPU 域内注入调试面板；登录页禁用按钮；快照预览后下载

## 5. 已知限制

1. **GDIPU 课表解析器未实现**（`BLOCKED_BY_REAL_PAGE_FIXTURE`）：
   等待第一份真实脱敏快照（见 `packages/adapters/src/gdipu/fixtures/README.md`）。
   在此之前扩展无法导出真实课表，仅能生成快照。
2. 提醒为占位（settings 的分钟数用于 ICS VALARM；站内通知未实现）。
3. 手动课程编辑未实现（P1）。
4. 扩展 ↔ Web 自动传输（方案 B）未实现，当前为 JSON 文件传递（方案 A，符合规划）。
5. 每周起始日设置仅影响视图顺序开关（周日开头尚未完全实现）。
6. mock 作息时间表不代表 GDIPU 真实作息；真实作息待校历数据。

## 6. 回归纪律

- 学校页面变化 → 新快照进 Fixture → 修复 Parser → 全量 Fixture 回归；
- Adapter 选择器/解析逻辑变化必须 bump `GDIPU_ADAPTER_VERSION`；
- 破坏协议变化必须 bump `protocolVersion`。
