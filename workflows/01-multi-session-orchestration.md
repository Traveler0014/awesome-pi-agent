# 01 · 多会话并行编排

## 背景

典型场景：**研究、执行、审查**各开一个 pi 会话，或同时推进多个独立 repo。

单会话串行的问题：

- 一个任务在等（网络、用户回复）时，另一个任务闲着；
- 多 repo 上下文互相污染，切来切去丢失状态。

## 分工模板

```
研究会话（research）      → 读文档、调查 API、定方案，产出结论
执行会话（execute）       → 改代码、跑测试、发 PR
审查会话（review）        → 检查 diff、找回归、验证发布
```

用 `pi-intercom` 把研究结论直接发给执行会话，审查结论发回给执行会话修订 —— 上下文只在需要时流动。

## 关键工具

- **pi-intercom**：会话间 1:1 消息。`/intercom`（`Alt+M`）选择接收者；agent 侧用 `intercom` 工具发 `ask`（阻塞式提问）/ `send`（通知式）。
- **pi-subagents**：会话内把独立子任务委派给子 agent（`delegate` 工具），链式或并行；子 agent 可通过 `contact_supervisor` 回报。

## 可复制提示词

```text
在 <repoA> 和 <repoB> 上并行推进：
1. 用 delegate 起两个子 agent，各自负责一个 repo：检出分支、实现、跑测试、推 PR；
2. 主会话只做编排与冲突处理；
3. 若某个子 agent 需要决策，让它通过 contact_supervisor 阻塞式提问；
4. 全部完成后汇总各 repo 的状态与 PR 链接。
```

```text
我有三个会话：research / execute / review。
- 把 research 的最新结论整理成要点，通过 intercom 发给 execute；
- execute 完成修改后把 diff 摘要发回给 review；
- review 的反馈再回到 execute 修订。全程不要把所有上下文塞进一个会话。
```

## 教训

- 会话间只传**结论和必要上下文**，不传原始大段输出，否则省下的时间又花在传输上。
- 并行子 agent 适合**边界清晰**的任务（各 repo、各模块）；共享文件/共享状态的改动串行更稳。
- 失败时明确退出码与错误信息，否则子 agent 之间互相猜测状态。
