# AGENTS.md

本文件是给 pi coding agent 的仓库说明，打开本仓库时自动加载。

## 仓库是什么

这不是一个插件注册表/awesome 列表，而是**可复刻的 pi 环境配置集**（作者 Traveler0014 的真实环境）：
正在用的 packages、脱敏配置、工作流与经验规则。主要用途是在新机器上快速恢复自己的 pi 环境，顺带分享。

## 工作守则

- **语言**：默认用中文回复（用户用中文时）；仅当用户明确要求时才提供英文。
- **密钥红线**：仓库内绝不允许出现真实 token / API key。
  - `config/` 由 `npm run sync` 从 `~/.pi/agent/` 生成并自动脱敏（token/apiKey → `YOUR_*` 或 `$ENV_VAR`）。
  - 需要刷新配置时运行 `npm run sync`，并检查 diff 中是否泄漏真实密钥。
  - 绝不读取或提交 `~/.pi/agent/auth.json`。
- **内容维护**：
  - packages / configs 变动 → 更新 `packages/README.md` 与 `config/`，保持与真实环境一致。
  - 新的工作流经验 → 追加到 `workflows/` 或 `learnings/`。
  - 不要把它改回「第三方插件目录」——那是本仓库 v1 的定位，已废弃。
- **经验规则**（详见 `learnings/README.md`，在本仓库工作时同样适用）：
  - 先确认范围再动手，避免范围蔓延。
  - 远程/复杂命令优先用脚本文件，避免 `-e` 长命令串。
  - 编辑后先跑 `lsp_diagnostics` 验证，再做回归测试。
  - 本地临时忽略用 `.git/info/exclude`，不改 `.gitignore`。
