# OpenClaw Agent Forge - 快速开始指南

## 📋 前提条件

1. **安装 OpenClaw CLI**
   ```bash
   npm install -g openclaw
   openclaw onboard --install-daemon
   ```

2. **验证安装**
   ```bash
   openclaw --version
   openclaw status
   ```

---

## 🚀 5 分钟快速开始

### 步骤 1: 克隆仓库

```bash
git clone https://github.com/srxly888-creator/openclaw-agent-forge.git
cd openclaw-agent-forge
```

### 步骤 2: 选择模板

**查看可用模板**:
```bash
ls -la agents/
```

**选择一个模板**:
```bash
# 示例：选择项目管理 Agent
cd agents/productivity/project-manager
```

### 步骤 3: 自定义配置

**编辑 SOUL.md**:
```bash
vim SOUL.md
```

**根据需求修改**:
- 角色定义
- 工作流程
- 约束条件

### 步骤 4: 部署到 OpenClaw

```bash
# 添加 Agent
openclaw agents add project-manager

# 配置渠道（可选）
openclaw agents bind project-manager --channel telegram --group-id YOUR_GROUP_ID

# 启动网关
openclaw gateway
```

### 步骤 5: 测试

在你的 Telegram 群组中 @mention Agent：
```
@project-manager 帮我规划今天的任务
```

---

## 🎯 三种使用方式

### 方式 1: AI 生成（推荐）

**描述你的需求**:
```bash
./scripts/generate_agent.sh "请创建一个专业的代码审查 Agent：
- 专注于 Python 和 JavaScript
- 检查代码质量、安全性、性能
- 提供改进建议
" ./agents/my-code-reviewer
```

**部署**:
```bash
./scripts/deploy_agent.sh my-code-reviewer
```

---

### 方式 2: 使用模板

**从模板库选择**:
```bash
./scripts/use_template.sh productivity/project-manager ./agents/my-pm
```

**自定义**:
```bash
vim ./agents/my-pm/SOUL.md
```

**部署**:
```bash
./scripts/deploy_agent.sh my-pm
```

---

### 方式 3: 导入他人 Agent

**从 GitHub 导入**:
```bash
./scripts/import_agent.sh https://github.com/user/awesome-agent
```

**部署**:
```bash
./scripts/deploy_agent.sh awesome-agent
```

---

## 📚 下一步

1. **阅读最佳实践**: [docs/best-practices.md](./docs/best-practices.md)
2. **查看示例**: [docs/examples.md](./docs/examples.md)
3. **分享你的 Agent**: [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 💡 提示

- ✅ **小步迭代**: 从简单 Agent 开始，逐步增加功能
- ✅ **测试优先**: 部署前先在沙盒环境测试
- ✅ **版本控制**: 使用 Git 管理你的 Agent 配置
- ✅ **社区分享**: 分享你的 Agent，获得反馈

---

**开始创建你的第一个 AI Agent！** 🚀
