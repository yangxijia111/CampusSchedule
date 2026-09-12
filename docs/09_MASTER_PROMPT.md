# CampusSchedule — CLI Agent 总提示词

你现在要开发一个高校课程表应用：

**CampusSchedule / 校园课表助手**

首个适配学校：

**广东轻工职业技术大学（GDIPU）**

项目目标不是破解学校系统，而是：

> 用户自己在学校官方页面完成统一身份认证后，由浏览器扩展读取用户当前有权限查看的个人学期课表，将其转换成标准课程数据，再导入 CampusSchedule PWA。

---

## 一、开始前必须执行

先完整阅读：

```text
docs/00_README.md
docs/01_PRD.md
docs/02_ARCHITECTURE.md
docs/03_DATA_MODEL.md
docs/04_GDIPU_ADAPTER.md
docs/05_SECURITY_PRIVACY.md
docs/06_PHASE_PLAN.md
docs/07_TEST_PLAN.md
docs/08_AGENT_RULES.md
```

阅读完成后：

1. 审计当前项目目录；
2. 判断当前属于哪个 Phase；
3. 不得跳 Phase；
4. 如果项目为空，从 Phase 0 开始；
5. 每个 Phase 完成后必须 build + test；
6. 输出 Phase 完成报告。

---

## 二、技术栈

使用：

```text
pnpm workspace
TypeScript
React
Vite
Zustand
Dexie / IndexedDB
Zod
Vitest
Playwright

Chrome/Edge Extension:
Manifest V3
```

项目采用：

```text
apps/web
apps/extension
packages/core
packages/adapters
packages/storage
packages/importer-protocol
```

---

## 三、最重要的安全规则

禁止实现：

```text
保存学校密码
自动输入密码
获取 password input
Cookie 窃取
Token 上传
验证码破解
验证码 OCR
绕过统一身份认证
自动选课
抢课
访问其他学生数据
修改教务系统数据
```

不申请：

```text
chrome.cookies
<all_urls>
```

扩展必须使用最小 host permissions。

---

## 四、GDIPU Adapter 规则

目前可以确认学校存在智慧校园/教务系统和学期课表功能。

但是：

**你不能假设当前 2026 年教务系统的具体 DOM/API。**

没有真实页面 Fixture 时：

你可以完成：

- Adapter interface；
- GDIPU domain detector；
- semantic page detector；
- Debug Snapshot；
- sanitizer；
- fixture framework；
- mock parser tests。

但是：

**禁止凭猜测写最终课表 selector/API。**

如果 Phase 7 前仍没有真实课表 Snapshot：

请明确输出：

```text
BLOCKED_BY_REAL_PAGE_FIXTURE
```

然后停止在“具体 GDIPU Parser”的边界。

不要因此停止整个项目中可以独立完成的其他通用模块。

---

## 五、真实页面适配流程

用户会：

1. 安装开发版扩展；
2. 自己打开学校官方系统；
3. 自己完成登录；
4. 自己进入“个人课表/学期课表”页面。

你的扩展需要：

1. 检测页面；
2. 显示 Debug Panel；
3. 用户点击“生成脱敏课表快照”；
4. 只导出课表相关 DOM；
5. 自动清理：
   - 密码
   - input value
   - token
   - cookie
   - SSO ticket
   - 学号
   - 姓名
6. 生成 Fixture；
7. 基于 Fixture 开发 Parser；
8. 创建 regression test。

---

## 六、课程数据

必须正确处理：

```text
课程名称
教师
地点
星期
起始节
结束节
周次
单双周
离散周
理论/实训差异
同一课程多个 Session
冲突课程
```

尤其不能把：

```text
1-8,10-12周
```

错误转换为：

```text
1-12周
```

不能把：

```text
1-16周(单)
```

转换成 1-16 全部周。

---

## 七、错误策略

如果：

- Adapter 找不到页面；
- DOM 变化；
- 解析数量异常；
- 字段不确定；

必须显式报错或 Warning。

禁止：

```text
catch(error) {}
```

禁止：

“解析失败后返回空数组并当成功”。

---

## 八、Phase 顺序

严格执行：

```text
Phase 0 工程初始化
Phase 1 Core Data Model
Phase 2 Week & Period Engine
Phase 3 PWA 基础界面
Phase 4 Local Storage
Phase 5 Browser Extension Skeleton
Phase 6 GDIPU Detection & Debug Snapshot
Phase 7 GDIPU Parser
Phase 8 Import Workflow
Phase 9 Timetable Intelligence
Phase 10 Product Polish & Release
```

---

## 九、每阶段结束必须执行

至少运行：

```bash
pnpm build
pnpm test
```

如果相关：

```bash
pnpm lint
pnpm test:e2e
```

任何失败必须先处理再汇报。

---

## 十、每阶段汇报

严格使用：

```md
# Phase X 完成报告

## 1. 工程审计

## 2. 本阶段实现

## 3. 新增文件

## 4. 修改文件

## 5. 测试

## 6. 安全检查

## 7. 已知限制

## 8. 下一阶段
```

---

## 十一、现在开始

如果当前目录为空：

立即开始 **Phase 0**。

不要一次性跨 Phase 0~10。

完成 Phase 0、验证通过、提交阶段报告后停止，等待下一条指令。
