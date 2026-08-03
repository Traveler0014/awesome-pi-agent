# packages/ — 我正在用的 10 个 packages

来源：`config/settings.json` 中 `packages` 数组（`npm run sync` 同步）。这 10 个包是我日常会话里**实际加载**的，按「为什么装」而非「看起来酷」选择。

## 一览

| Package | 类型 | 一句话 | 安装源 |
|---|---|---|---|
| [pi-alarm](https://github.com/Traveler0014/pi-alarm) | 🔧 自研 | 定时闹钟/提醒，agent 可给自己和用户设提醒 | git |
| [pi-github](https://github.com/Traveler0014/pi-github) | 🔧 自研 | GitHub/Gitea/Forgejo 多平台 issue/PR/release 自动化 | git |
| [pi-providers](https://github.com/Traveler0014/pi-providers) | 🔧 自研 | 4 个自定义 provider：Cloudflare-OpenRouter、DashScope、Kimi、智谱 | git |
| [pi-lsp](https://github.com/Traveler0014/pi-lsp) | 🔧 自研 | 多语言 LSP 桥接：诊断/定义/引用/hover/重命名 | git |
| [@mrclrchtr/supi-context](https://github.com/mrclrchtr/supi) | 📦 第三方 | `/supi-context` 查看上下文窗口占用明细 | npm |
| [@mrclrchtr/supi-insights](https://github.com/mrclrchtr/supi) | 📦 第三方 | `/supi-insights` 分析历史会话生成 HTML 复盘报告 | npm |
| [@petechu/pi-extension-toggle](https://www.npmjs.com/package/@petechu/pi-extension-toggle) | 📦 第三方 | 会话内开关 extensions/skills/prompts/themes | npm |
| [@narumitw/pi-btw](https://www.npmjs.com/package/@narumitw/pi-btw) | 📦 第三方 | `/btw` 旁路提问，不污染主会话上下文 | npm |
| [pi-subagents](https://github.com/nicobailon/pi-subagents) | 📦 第三方 | 子 agent 委派：链式 / 并行 / TUI 澄清 | npm |
| [pi-intercom](https://github.com/nicobailon/pi-intercom) | 📦 第三方 | 本地多 pi 会话 1:1 通信与协调 | npm |

## 自研（4 个）

### pi-alarm — 定时闹钟

- 工具：`alarm_now` / `alarm_wait`（相对）/ `alarm_set`（绝对）/ `alarm_list` / `alarm_cancel`
- 命令：`/alarm-set`（自然语言）、`/alarm-in`、`/alarm-at`、`/alarm-list`、`/alarm-cancel`、`/alarm-clear`
- **为什么装**：长任务里让 agent 主动安排提醒；也是「定时驱动的 agent 工作流」（见 [workflows/02](../workflows/02-alarms-and-scheduling.md)）的基础。
- **坑**：绝对时间（`alarm_set`）必须带本地时区偏移，先 `alarm_now` 确认偏移再构造 ISO 时间戳。

### pi-github — 多平台 Git forge 自动化

- 16 个工具：`gh_issue_*`、`gh_pr_*`、`gh_repo_get`、`gh_list_branches`、`gh_list_contents`、`gh_get_file`、`gh_instance_*`
- 命令：`/gh-login`、`/gh-default`、`/gh-forget`、`/gh-status`
- **为什么装**：日常 80% 的 repo 操作（开 issue、发 PR、打 release、跨 repo 同步）直接由 agent 完成；支持多实例（GitHub + 自建 Gitea/Forgejo）同时操作。
- 配置示例见 `config/pi-github-config.example.json`。

### pi-providers — 自定义模型供应商

- 4 个 provider：`cloudflare-openrouter`（经 Cloudflare AI Gateway 走 OpenRouter，13 个模型）、`dashscope`、`kimi`、`zhipu`
- **为什么装**：一个插件补齐国内可直连的模型源 + 动态模型发现；配合默认 `deepseek-v4-flash` 做日常主力、GLM 系做高思考任务。
- `config/models.json` 是 zhipu provider 的完整示例（apiKey 用 `$ZHIPU_API_KEY` 环境变量引用）。

### pi-lsp — 多语言 LSP 桥接

- 工具：`lsp_diagnostics` / `lsp_definition` / `lsp_references` / `lsp_hover` / `lsp_rename`
- 命令：`/lsp-status`
- **为什么装**：编辑完立刻拿到编译器诊断，不用跑完整构建/tsc——这是 [workflows/03 诊断→修复→验证闭环](../workflows/03-diagnose-fix-verify-loop.md) 的核心工具。

## 第三方（6 个）

### supi 系（@mrclrchtr）— 上下文与复盘

- `supi-context`：`/supi-context` 渲染上下文占用报告（系统提示、消息、工具结果各自占多少 token），长会话里判断「还能撑多久」。
- `supi-insights`：`/supi-insights` 扫描历史会话 → 生成可分享的 HTML 报告（项目领域、交互风格、摩擦分析、图表）。
- **为什么装**：前者省 token，后者让「用 pi 的方式」本身可被审视——`learnings/` 的数据就来自这份报告。

### pi-extension-toggle — 会话内开关扩展

- `/extension-toggle` 或 `Ctrl+Shift+E`：按来源分组列出已装 extensions/skills/prompts/themes，勾选后写回 settings 并热重载。
- **为什么装**：按需启用，不必为了关一个包去改配置重启。

### pi-btw — 旁路提问

- `/btw`：开一个临时侧线程回答问题，不写入主会话历史。
- **为什么装**：调试中想顺口问「这个 API 签名是什么」，不想污染主线上下文。

### pi-subagents — 子 agent 委派

- 委派子任务：链式执行、并行执行、TUI 澄清；提供 `delegate` 工具与 `/subagents` 命令族。
- **为什么装**：多 repo 并行更新、独立模块重构时把任务拆给子 agent，主会话只做编排（见 [workflows/01](../workflows/01-multi-session-orchestration.md)）。

### pi-intercom — 会话间通信

- 本地 IPC broker 上的 1:1 消息；`intercom` 工具 + `/intercom`（`Alt+M`）UI；与 pi-subagents 集成后子 agent 可用 `contact_supervisor`。
- **为什么装**：真实场景里经常同时开 2~3 个 pi（研究/执行/审查），intercom 让它们互传上下文、交换结论，互不干扰。

## 为什么没有更多？

我刻意**没有**装那些看起来很炫的插件。经验是：每个常驻 package 都会占系统提示空间（`/supi-context` 能直接看到），装多了反而稀释主任务。需要某能力时用 `/btw` 或临时 `pi -e` 加载，长期高频才进 settings。
