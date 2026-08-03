# 04 · 洞察驱动的复盘（supi-insights）

## 背景

「用 pi 的方式」本身是黑盒：时间花在哪了？哪些模式在反复摩擦？supi-insights 把会话历史变成一份可读的 HTML 报告，让使用习惯可以被审视、被改进。

## 流程

```text
1. 在 pi 里运行 /supi-insights
2. 等它扫描会话历史、做 facet 提取、聚合统计
3. 打开生成的 HTML 报告（report-<timestamp>.html）
4. 重点看四个板块：
   - At a Glance      → 什么在起作用 / 什么在拖后腿 / 快速赢
   - Friction         → 摩擦类型统计（buggy code？scope？）
   - Suggested CLAUDE.md → 下一阶段该固化的规则
   - Features to Try  → 还没用但值得试的能力
5. 把「拖后腿」项转成下个月的 1~2 条具体规则，写进 learnings/
```

## 复盘输出模板

| 维度 | 看什么 | 行动 |
|---|---|---|
| 目标达成 | Fully / Partially 占比 | 保持「先确认范围」 |
| 摩擦 Top | buggy code / misunderstood request | 固化诊断闭环 |
| 亮点 | 反复成功的工作流 | 固化成文档/提示词 |
| 值得试 | Features to Try 清单 | 逐条试用并落地 |

## 可复制提示词

```text
运行 /supi-insights，然后基于报告给我一份「下月改进计划」：
- 从 At a Glance 提取 3 个 quick wins；
- 从摩擦统计里挑出 Top 2 摩擦，各给一条可执行规则；
- 从 Suggested CLAUDE.md 里选 1 条加入 AGENTS.md。
```

## 注意

- 报告是**趋势**不是审判：单次会话的「Not Achieved」不代表什么，看分布。
- 复盘的产出必须是**具体规则**（写进 AGENTS.md / learnings），否则看完就忘。
