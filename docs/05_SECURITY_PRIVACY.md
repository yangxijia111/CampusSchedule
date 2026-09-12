# 05 — 安全与隐私要求

## 1. 核心原则

本应用不是学校官方应用。

必须做到：

- 最小权限；
- 本地优先；
- 不接触不必要的账号凭据；
- 用户主动触发导入；
- 只读取用户自己有权限查看的数据。

## 2. 明确禁止

任何 Agent/开发者不得实现：

- 保存学校密码；
- 上传学校密码；
- 自动填写学校密码；
- 读取 password input；
- 绕过验证码；
- OCR 破解验证码；
- 绕过二次认证；
- 伪造统一身份认证；
- Cookie 窃取；
- Token 上传；
- 自动选课；
- 抢课；
- 未授权查询他人课表/个人信息；
- 批量枚举学生；
- 修改学校系统数据。

## 3. Extension 权限

Manifest V3。

不要申请：

```json
"<all_urls>"
```

只申请必要学校域：

```text
host_permissions:
- 已确认的 GDIPU 教务相关域
```

如果后续新增学校：

按 Adapter 单独申请。

## 4. DOM 读取限制

Content Script：

- 只在用户点击“解析课表”后读取；
- 默认不监听 input；
- 不读取登录页表单；
- 遇到 `input[type=password]` 页面，导入按钮必须禁用。

## 5. Cookie

MVP 不使用：

```text
chrome.cookies
```

不需要 Cookie API。

因为 Content Script 已经运行在用户现有登录页面中。

## 6. 数据存储

默认本地：

- IndexedDB；
- extension local storage。

不得保存：

- 密码；
- session cookie；
- access token；
- refresh token；
- CAS ticket；
- SSO ticket。

## 7. URL 脱敏

保存来源 URL 前必须删除：

- `token`
- `ticket`
- `code`
- `session`
- `sid`
- `auth`
- 以及未知高熵 query 参数。

## 8. Snapshot 脱敏

Debug Snapshot 必须：

- 删除 input value；
- 删除 script 中明显 token；
- 删除 meta auth；
- 删除 data-user-id 等个人标识；
- 对学号用 `[STUDENT_ID]`；
- 对姓名用 `[USER_NAME]`。

生成前让用户预览。

## 9. 云同步

如果未来增加云同步：

只同步标准课表数据。

认证凭据仍不能同步。

## 10. 开源提示

如果项目公开：

README 必须说明：

- 非学校官方应用；
- 数据来源于用户自行授权访问；
- 不提供绕过认证功能；
- 学校页面变化可能导致 Adapter 失效。
