# 08 — Agent 开发规则

## 1. 首要规则

Agent 必须先阅读：

```text
docs/00_README.md
docs/01_PRD.md
docs/02_ARCHITECTURE.md
docs/03_DATA_MODEL.md
docs/04_GDIPU_ADAPTER.md
docs/05_SECURITY_PRIVACY.md
docs/06_PHASE_PLAN.md
docs/07_TEST_PLAN.md
```

## 2. 不得猜学校接口

没有真实证据时：

禁止：

- 猜 API URL；
- 猜参数；
- 猜 selector；
- 从其他学校代码照搬；
- 根据旧教程假设当前系统仍相同。

遇到缺少真实页面：

输出：

```text
BLOCKED_BY_REAL_PAGE_FIXTURE
```

并完成可以先完成的通用架构。

## 3. 不得碰认证

Agent 不得要求用户提供：

- 学号；
- 密码；
- Cookie；
- Token；
- 验证码。

用户必须自己在官方站完成认证。

## 4. 修改原则

- 小步提交；
- 每 Phase 编译；
- 每 Phase 测试；
- 不重写无关模块；
- 不创建重复架构；
- 优先修根因；
- 保留错误日志。

## 5. 每 Phase 汇报格式

```md
# Phase X 完成报告

## 1. 完成内容

## 2. 新增文件

## 3. 修改文件

## 4. 测试结果

## 5. 已知限制

## 6. 下一 Phase 前置条件

## 7. 是否存在阻塞
```

## 6. 完成标准

不能只说“代码已实现”。

必须给：

- build command；
- test command；
- test result；
- 关键文件；
- 手工验证方式。

## 7. 数据真实性

如果 Parser 无法确定字段：

宁可：

```ts
warning
```

也不能自己补值。

## 8. UI

UI 可以创新，但不要影响：

- 可读性；
- 星期列；
- 节次定位；
- 周次准确性。

## 9. 安全

发现实现需要：

- 认证绕过；
- 密码存储；
- cookie 抓取；
- captcha bypass；

立即停止该方案，切换到用户手动登录 + 登录后页面解析模式。
