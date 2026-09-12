# 04 — 广东轻工职业技术大学 GDIPU Adapter 规格

## 1. Adapter ID

```text
gdipu
```

## 2. 已知官方域名

开发时允许匹配但不要过度扩大权限：

```text
https://*.gdipu.edu.cn/*
```

扩展 manifest 中不要默认申请 `<all_urls>`。

初期只申请确认过的学校相关域。

## 3. 已确认入口

学校官网存在：

- 智慧3.0入口；
- 教务系统入口；
- `my.gdipu.edu.cn` 智慧校园入口。

但：

**不要把 `my.gdipu.edu.cn` 等同于最终课表页面 URL。**

登录后可能跳转到其他业务系统。

Adapter 必须根据真实登录后的页面动态识别。

## 4. Page Detection

检测优先级：

### Level 1：域名

判断是否属于 GDIPU 官方相关域。

### Level 2：页面语义

查找：

- 学期课表
- 我的课表
- 学生课表
- 课表查询
- 理论课表
- 实训课表

### Level 3：页面结构

识别：

- 学期选择器；
- 星期列；
- 节次行；
- 课程格；
- 课程详情数据。

只有 Level 2 + Level 3 足够可信时才能执行正式导入。

## 5. 数据来源优先级

### 优先 1：页面自身已经加载的结构化数据

如果页面中存在：

- `window.__INITIAL_STATE__`
- JSON script
- Vue/React hydration data
- grid datasource

优先解析结构化数据。

### 优先 2：课表 DOM

直接解析已渲染课表。

### 不推荐

主动猜 API。

禁止根据网上旧代码猜：

```text
/jwglxt/...
/xskbcx/...
```

除非已经通过当前系统真实请求验证。

## 6. 课表 DOM Snapshot 工具

Extension Debug Mode 增加按钮：

```text
生成脱敏课表快照
```

快照只保存：

- 课表容器 HTML；
- 页面标题；
- 当前 URL（脱敏）；
- 学期文本；
- Adapter 调试信息。

自动移除：

- input value；
- password；
- token；
- cookie；
- authorization；
- 学号；
- 姓名（尽可能脱敏）。

生成：

```text
gdipu-timetable-snapshot.html
gdipu-debug.json
```

用于开发 Fixture。

## 7. Fixture Driven Development

真实页面确认后：

```text
packages/adapters/gdipu/fixtures/
├─ semester-2026-fall.html
├─ timetable-normal.html
├─ timetable-odd-even.html
├─ timetable-practical.html
└─ timetable-empty.html
```

Parser 测试必须离线运行，不依赖学校服务器。

## 8. Adapter 失败策略

如果：

- selector 找不到；
- 列数变化；
- 课程单元格结构变化；
- 学期解析失败；

输出：

```text
ADAPTER_OUTDATED
```

UI 显示：

> 当前教务系统页面结构与此版本适配器不一致。请更新适配器或生成脱敏调试快照。

不得返回“空课表”冒充解析成功。

## 9. Adapter Version

```ts
export const GDIPU_ADAPTER_VERSION = "0.1.0";
```

每次选择器/解析逻辑变化：

- bump patch/minor；
- import record 保存 adapterVersion。

## 10. 开发时的真实验证步骤

1. 安装开发版扩展。
2. 用户自己打开 GDIPU 官方页面。
3. 用户自行输入账号/密码并登录。
4. Agent 不记录键盘输入。
5. 用户进入个人课表页面。
6. Extension Debug Mode 检测页面。
7. 生成脱敏 Snapshot。
8. 将 Snapshot 加入 Fixture。
9. 完成 Parser。
10. 用真实页面做一次人工对照。
