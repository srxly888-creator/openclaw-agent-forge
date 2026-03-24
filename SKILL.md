# OpenClaw Agent Forge 技能说明

## 触发场景

当用户需求涉及以下内容时，使用本技能：

- 创建或初始化 OpenClaw 智能体
- 配置沙箱权限与工具白名单
- 扫描智能体目录的安全风险
- 按四层标准校验仓库质量
- 在 Forge 与 OpenClaw 之间进行配置同步

## 核心命令

```bash
forge create <agent-name> --scenario <scenario> --security <level>
forge swarm create <swarm-name> --agents <a,b,c>
forge scan [path]
forge validate --four-layer [--strict]
forge sync <agent-name> --direction <to-openclaw|from-openclaw|bidirectional> [--watch]
forge list --scope <forge|openclaw|both> --format <table|json>
```

## 工具边界

- 读写范围：当前工作区 + OpenClaw 目标目录。
- 网络与工具权限：遵循插件沙箱配置，默认最小权限。
- 危险能力（如 `exec`、大范围写入、全网络）需明确理由与约束。

## 安全要求

- 禁止在 `SOUL.md`、源码或插件配置里硬编码密钥。
- 无明确必要时优先使用 `maximum` 或 `high` 配置。
- 提交前建议执行 `forge scan` 与 `forge validate --strict`。

## 异常处理

- 命令失败时提供可执行的错误信息。
- 同步阶段若 JSON 无效，应中断并提示修复。
- 监听模式下可恢复错误应记录日志并继续监听。
