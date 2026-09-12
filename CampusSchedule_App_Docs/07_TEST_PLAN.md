# 07 — 测试计划

## 1. Unit Test

重点：

### 周次

必须覆盖：

```text
1-16周
1-16周(单)
1-16周(双)
1,3,5周
1-8,10-16周
1-4周,6周,9-12周
```

### 节次

覆盖：

- 1-2
- 第1-2节
- 1,2节
- 连续多节

### 文本

覆盖：

- 全角括号；
- 中文逗号；
- 多余空格；
- 换行；
- 空字段。

## 2. Adapter Fixture Test

每份真实脱敏 Snapshot 都必须有预期 JSON：

```text
fixture.html
fixture.expected.json
```

运行：

```text
parse(html) === expected
```

## 3. Regression Test

学校页面改变后：

1. 新建 Fixture；
2. 先复现失败；
3. 修 Parser；
4. 确保历史 Fixtures 不退化。

## 4. E2E

Playwright：

### Web

- 导入 Fixture JSON；
- 显示学期；
- 显示周课表；
- 切换周；
- 打开课程详情；
- 导出数据。

### Extension

可使用本地模拟站点测试：

```text
tests/mock-school/
```

不要让 CI 访问真实学校登录系统。

## 5. Security Test

检查：

- manifest 无 `<all_urls>`；
- 无 `cookies` 权限；
- 源码无 password logger；
- 无 token persistence；
- Snapshot sanitizer 有测试；
- URL sanitizer 有测试。

## 6. Import Integrity

导入后统计：

```text
source cell count
parsed session count
warning count
```

如果出现异常下降：

阻止自动覆盖旧课表。

例如：

旧版本 25 个 Session；
新导入只有 3 个 Session；

应提示：

> 新课表数据量异常，可能是教务页面结构变化。

不能直接覆盖。
