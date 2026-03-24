# Agent 同步指南

> 实现 Agent Forge ↔ OpenClaw Web UI 双向同步

---

## 🎯 功能说明

### 双向同步
- **Forge → OpenClaw**: 将 Forge 生成的 Agent 同步到 OpenClaw
- **OpenClaw → Forge**: 从 OpenClaw 修改的配置同步回 Forge
- **实时监听**: 文件变化时自动同步

### 配置映射

| Forge 配置 | OpenClaw 配置 | 说明 |
|-----------|--------------|------|
| SOUL.md | models.json | Agent 身份和模型配置 |
| AGENTS.md | auth-profiles.json | 工作空间和认证配置 |
| skills/ | - | 技能目录（暂不同步） |

---

## 🚀 快速开始

### 1. 同步单个 Agent

```bash
# 将 Forge Agent 同步到 OpenClaw
forge sync my-agent --direction to-openclaw

# 从 OpenClaw 同步到 Forge
forge sync my-agent --direction from-openclaw

# 双向同步（默认）
forge sync my-agent
```

### 2. 实时同步

```bash
# 启动文件监听，实时同步
forge sync my-agent --watch
```

### 3. 列出所有 Agent

```bash
# 表格格式
forge list

# JSON 格式
forge list --format json
```

---

## 📋 使用场景

### 场景 1: 从 Forge 创建 Agent

```bash
# 1. 在 Forge 中创建 Agent
forge create my-new-agent --template basic

# 2. 同步到 OpenClaw
forge sync my-new-agent --direction to-openclaw

# 3. 在 OpenClaw Web UI 中查看
# 打开 http://localhost:18789
# Agent 会自动出现在列表中
```

### 场景 2: 在 OpenClaw 中修改 Agent

```bash
# 1. 启动实时同步
forge sync my-agent --watch

# 2. 在 OpenClaw Web UI 中修改
# - 修改模型
# - 调整参数

# 3. Forge 自动更新
# SOUL.md 和 AGENTS.md 会自动更新
```

### 场景 3: 从 OpenClaw 导入 Agent

```bash
# 1. 在 OpenClaw 中配置好 Agent

# 2. 同步到 Forge
forge sync existing-agent --direction from-openclaw

# 3. 在 Forge 中查看
cd agents/existing-agent
cat SOUL.md
```

---

## 🔧 配置说明

### OpenClaw 配置结构

```
~/.openclaw/
└── agents/
    └── <agent-name>/
        └── agent/
            ├── models.json        # 模型配置
            └── auth-profiles.json # 认证配置
```

### Forge 配置结构

```
/Volumes/PS1008/Github/openclaw-agent-forge/
└── agents/
    └── <agent-name>/
        ├── SOUL.md          # Agent 身份
        ├── AGENTS.md        # 工作空间配置
        └── skills/          # 技能目录
```

---

## 🎨 SOUL.md 模板

```markdown
# SOUL.md - Who You Are

## Configuration

- **Model**: glm-5
- **Provider**: zai
- **Context Window**: 204800

## Boundaries

- Private things stay private. Period.
- When in doubt, ask before acting externally.

---

_This file is yours to evolve. Update it as you learn._
```

---

## 🔄 同步流程

### Forge → OpenClaw

1. 读取 `SOUL.md` 和 `AGENTS.md`
2. 解析配置信息（模型、提供商等）
3. 生成 `models.json` 和 `auth-profiles.json`
4. 写入 `~/.openclaw/agents/<agent-name>/agent/`

### OpenClaw → Forge

1. 读取 `models.json` 和 `auth-profiles.json`
2. 提取配置信息
3. 生成 `SOUL.md` 和 `AGENTS.md`
4. 写入 `agents/<agent-name>/`

---

## ⚠️ 注意事项

### 1. API Keys

**不要在 SOUL.md 中硬编码 API Keys！**

```markdown
# ❌ 错误
- **API Key**: sk-ant-api03-xxx

# ✅ 正确
- **API Key**: 从环境变量读取
```

使用环境变量：
```bash
export ZHIPUAI_API_KEY="your-key"
export ANTHROPIC_API_KEY="your-key"
export OPENAI_API_KEY="your-key"
```

### 2. 冲突处理

当两边都修改时：
- **to-openclaw**: Forge 覆盖 OpenClaw
- **from-openclaw**: OpenClaw 覆盖 Forge
- **bidirectional**: 最后修改的生效

### 3. 文件监听

`--watch` 模式会持续运行，按 `Ctrl+C` 停止。

---

## 🐛 故障排除

### 问题 1: Agent 未出现在 OpenClaw Web UI

**检查**:
```bash
# 确认配置文件存在
ls ~/.openclaw/agents/<agent-name>/agent/

# 检查 JSON 格式
cat ~/.openclaw/agents/<agent-name>/agent/models.json | jq .
```

**解决**:
- 确认 OpenClaw Gateway 正在运行
- 重启 Gateway: `openclaw gateway restart`

### 问题 2: 同步失败

**检查**:
```bash
# 确认 Forge 路径正确
ls /Volumes/PS1008/Github/openclaw-agent-forge/agents/<agent-name>/

# 检查文件权限
ls -la ~/.openclaw/agents/
```

**解决**:
- 确保有读写权限
- 检查磁盘空间

---

## 📊 性能优化

### 批量同步

```bash
# 同步所有 Agent
for agent in $(forge list --format json | jq -r '.[]'); do
  forge sync "$agent" --direction to-openclaw
done
```

### 增量同步

只有文件变化时才同步，避免重复操作。

---

## 🔐 安全最佳实践

1. **使用环境变量** - 不要硬编码 API Keys
2. **最小权限** - 只同步必要的配置
3. **定期备份** - 在修改前备份配置
4. **审计日志** - 记录同步操作

---

## 🎯 下一步

1. **测试同步功能**
   ```bash
   forge create test-agent
   forge sync test-agent --watch
   ```

2. **在 OpenClaw Web UI 中验证**
   - 打开 http://localhost:18789
   - 查看 test-agent 是否出现

3. **修改配置测试同步**
   - 在 Web UI 中修改模型
   - 检查 SOUL.md 是否更新

---

## 📝 示例配置

### models.json (OpenClaw)

```json
{
  "providers": {
    "zai": {
      "baseUrl": "https://open.bigmodel.cn/api/coding/paas/v4",
      "api": "openai-completions",
      "models": [
        {
          "id": "glm-5",
          "name": "GLM-5",
          "reasoning": true,
          "input": ["text"],
          "contextWindow": 204800,
          "maxTokens": 131072
        }
      ]
    }
  }
}
```

### SOUL.md (Forge)

```markdown
# SOUL.md - Who You Are

## Configuration

- **Model**: glm-5
- **Provider**: zai
- **Context Window**: 204800
```

---

> 💡 **提示**: 双向同步让你的 Agent 在 Forge 和 OpenClaw 之间无缝切换！
