# config/ — 实时同步的脱敏配置

这里的 JSON 不是手写示例，而是从真实环境 `~/.pi/agent/` **同步生成**的：

```bash
npm run sync
```

同步脚本会：

1. 读取 `~/.pi/agent/settings.json`、`models.json`、`pi-github-config.json`、`pi-search.json`
2. 自动脱敏：`token` / `apiKey` 等字段若不是 `$ENV_VAR` 引用，一律替换为 `YOUR_*` 占位符
3. 掩掉私有地址：`pi-github-config` 中非公开的 `baseUrl` 主机名替换为 `your-forgejo.example`
4. 写盘前再扫一遍 token 形状（`ghp_` / `github_pat_` / `sk-` / 40+ 位十六进制），命中就**拒绝写入并以非零码退出**
5. 写入 `config/`，其中 `pi-github-config.json`、`pi-search.json` 作为**示例文件**输出

`auth.json` 永不复制。

## 文件说明

| 文件 | 说明 |
|---|---|
| `settings.json` | 全局设置：默认 provider/model、thinking level、**实际安装的 14 个 packages**、主题 |
| `models.json` | 自定义 provider 模型表（智谱 glm 系列；其余 provider 见 `packages/` 中的 pi-providers） |
| `pi-github-config.example.json` | pi-github 插件多平台配置示例：GitHub + 自建 Forgejo 实例（token 脱敏、私有主机名已替换） |
| `pi-search.example.json` | pi-search 搜索后端配置示例（Tavily / DeepSeek，key 已脱敏） |

## 适配到你的机器

```bash
# 1. 把配置拷到你的 pi agent 目录
cp config/settings.json ~/.pi/agent/settings.json
cp config/models.json ~/.pi/agent/models.json

# 2. 设置环境变量（models.json 里是 $ZHIPU_API_KEY 引用）
export ZHIPU_API_KEY="你的智谱 key"

# 3. pi-github / pi-search 配置
#    在 pi 里执行 /gh-login 写 pi-github-config.json，或参考示例手填 token 与 forge 地址
#    执行 /search-config 填搜索后端 key，或参考 pi-search.example.json 手写 pi-search.json
```

## 说明

- `settings.json` 中的 `lastChangelogVersion` 只是 pi 的版本记录字段，同步自真实环境，可忽略。
- `models.json` 的 `apiKey` 是 `$ZHIPU_API_KEY` 环境变量引用，不含真实密钥。
