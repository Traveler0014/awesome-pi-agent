# learnings/ — 工具使用注意事项

> 长期使用 pi 及上述 packages 沉淀的规则（复盘数据来源：`/supi-insights` 报告）。
> 每一条都是「换机器后也要记得」的经验，随配置一起带走。

## 五大规则

1. **开工前复述范围。** 比用户想要的多做一步是最常见的返工来源。开工前用一句话复述目标让用户确认。
2. **编辑后立刻验证。** 用 `lsp_diagnostics` + 相关测试 + 手动走受影响路径，改一个验一个（见 [workflows/03](../workflows/03-diagnose-fix-verify-loop.md)）。
3. **远程与复杂命令用脚本文件。** 别用 `-e` 拼长命令串（路径/引号问题反复出现）；SSH 远程执行写成单文件脚本再跑。
4. **本地忽略用 `.git/info/exclude`。** 局部调试不污染 `.gitignore`，避免把无关改动带进提交。
5. **定时任务相对/绝对分开测。** `alarm_set` 绝对时间必须带本地时区偏移，先 `alarm_now` 拿偏移（见 [workflows/02](../workflows/02-alarms-and-scheduling.md)）。

## 环境摩擦（外部，但可以预防）

LSP 自动安装失败、网络超时、远程认证 —— 三类反复出现的环境问题。对策：预验证环境；失败时给出明确错误信息，而不是静默重试。

## 值得试的能力

| 能力 | 状态 |
|---|---|
| 子 agent 并行（subagents + intercom） | ✅ 已落地，见 [workflows/01](../workflows/01-multi-session-orchestration.md) |
| 诊断→修复→验证自愈循环 | ✅ 已落地，见 [workflows/03](../workflows/03-diagnose-fix-verify-loop.md) |
| hooks 触发（编辑/提交后自动跑检查） | 🔜 计划中 |
| workspace / 检查点持久化 | 🔜 长项目计划中 |
