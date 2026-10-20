# Awesome Pi Agent — pi 环境复刻工具包

> 一份**可复刻**的 pi coding agent 环境配置集：我正在用的 packages、配置与工作流。
> 主要用途：**在新机器上快速恢复我的 pi 环境**；顺带以「工具介绍」的方式分享给其他 pi 用户参考。

**EN** — A reproducible pi coding-agent environment kit: the exact packages, configs, and usage workflows I run. Mainly for restoring my setup on a new machine; also shared as tool documentation.

## 定位

- **给自己用**：`npm run sync` 让 `config/` 与本地 `~/.pi/agent/` 保持同步，换机器几分钟恢复环境。
- **工具介绍**：每个 package 讲清「解决什么问题、为什么选它、怎么用」，不堆第三方插件。

## 环境速览

| 项 | 值 |
|---|---|
| pi 版本 | 1.3.0 |
| 默认 provider / model | `deepseek` / `deepseek-flash` |
| 默认 thinking level | `high` |
| 主题 | `dark` |
| packages | 14 个（8 自研 + 6 第三方），见 [packages/](./packages/) |

## 目录

| 目录 | 内容 |
|---|---|
| [config/](./config/) | 实时同步的脱敏配置 + 适配指南 |
| [packages/](./packages/) | 我在用的 14 个 pi packages，逐个说明 |
| [workflows/](./workflows/) | 工具使用工作流（多会话编排、定时提醒、诊断闭环、复盘、上下文管理、联网调研） |
| [learnings/](./learnings/) | 工具使用注意事项与经验规则 |
| [AGENTS.md](./AGENTS.md) | 给 pi 的仓库说明（在本仓库工作时自动加载） |

## 快速复刻（新机器几分钟）

```bash
# 1. 安装 14 个 packages（等价于我的 settings.json）

# 自研
pi install https://github.com/Traveler0014/pi-alarm.git
pi install https://github.com/Traveler0014/pi-providers.git
pi install https://github.com/Traveler0014/pi-lsp.git
pi install https://github.com/Traveler0014/pi-github.git
pi install https://github.com/Traveler0014/pi-extension-dev.git
pi install https://github.com/Traveler0014/pi-browser-use.git
pi install https://github.com/Traveler0014/pi-context-manager.git
pi install https://github.com/Traveler0014/pi-search.git

# 第三方
pi install npm:@mrclrchtr/supi-context
pi install npm:@mrclrchtr/supi-insights
pi install npm:@petechu/pi-extension-toggle
pi install npm:@narumitw/pi-btw
pi install npm:pi-subagents
pi install npm:pi-intercom

# 2. 参考配置
#    - config/settings.json                 → ~/.pi/agent/settings.json
#    - config/models.json                   → ~/.pi/agent/models.json（把 $XXX_API_KEY 换成你的环境变量）
#    - config/pi-search.example.json        → ~/.pi/agent/pi-search.json（填搜索后端 key）
#    - config/pi-github-config.example.json → ~/.pi/agent/pi-github-config.json（填 token 与私有 forge 地址）

# 3. 本地同步（可选）：刷新 config/ 与真实环境保持一致
npm install && npm run sync
```

## License

[MIT](./LICENSE)
