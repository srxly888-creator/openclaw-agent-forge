# 同步指南

Agent Forge 支持与 OpenClaw 的双向配置同步。

## 路径约定

- Forge 侧：`./agents/<agent-name>/`
- OpenClaw 侧：`~/.openclaw/agents/<agent-name>/agent/`

## 常用命令

将 Forge 配置推送到 OpenClaw：

```bash
forge sync my-agent --direction to-openclaw
```

从 OpenClaw 拉取到 Forge：

```bash
forge sync my-agent --direction from-openclaw
```

双向顺序同步：

```bash
forge sync my-agent --direction bidirectional
```

开启持续监听：

```bash
forge sync my-agent --watch
```

## 同步方向说明

| direction | 行为 |
|-----------|------|
| `to-openclaw` | 从 Forge 推送到 OpenClaw |
| `from-openclaw` | 从 OpenClaw 拉回到 Forge |
| `bidirectional` | 先推送再拉回，适合首次对齐两侧内容 |

## 文件映射

- `SOUL.md` -> `models.json`
- `AGENTS.md` -> `auth-profiles.json`

## 注意事项

1. `--watch` 启动前，Forge 和 OpenClaw 两侧目录都必须存在。
2. `models.json` 至少要包含一个 provider 和一个 model。
3. API Key 应来自环境变量，避免写入并提交到仓库。
4. 初次同步建议先跑一次 `forge sync <agent-name> --direction bidirectional`，确认两侧文件格式都正确，再开启监听。

## 故障排查

智能体不存在：

```bash
ls ./agents/my-agent
ls ~/.openclaw/agents/my-agent/agent
```

JSON 解析错误：

```bash
cat ~/.openclaw/agents/my-agent/agent/models.json | jq .
cat ~/.openclaw/agents/my-agent/agent/auth-profiles.json | jq .
```
