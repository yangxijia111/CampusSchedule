# CLI Agent 后续 Phase 通用提示词

继续开发 CampusSchedule。

开始前：

1. 阅读 `docs/` 中全部项目规范；
2. 阅读上一个 Phase 完成报告；
3. 审计当前代码；
4. 确认没有未解决的 build/test error；
5. 只执行 `06_PHASE_PLAN.md` 中的下一个 Phase；
6. 不提前实现后续 Phase；
7. 不重写已有稳定架构；
8. 不猜 GDIPU 当前接口或 DOM；
9. 涉及真实学校登录时，只允许用户手动登录；
10. 不读取或保存账号密码、Cookie、Token、验证码。

完成本 Phase 后：

- `pnpm build`
- `pnpm test`
- 必要时 `pnpm lint`
- 必要时 `pnpm test:e2e`

全部通过后，按照 `08_AGENT_RULES.md` 输出完整 Phase 完成报告，然后停止。
