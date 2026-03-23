# 🦞 OpenClaw Agent Forge

> **专业子 Agent 管理工具：智能生成、模板库、一键部署、版本控制、社区分享**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Stars](https://img.shields.io/github/stars/srxly888-creator/openclaw-agent-forge?style=social)](https://github.com/srxly888-creator/openclaw-agent-forge)

---

## 🎯 项目目标

**解决痛点**:
- ❌ 手动创建 SOUL.md、AGENTS.md、USER.md 繁琐
- ❌ 缺少标准化的 Agent 管理工具
- ❌ 难以分享和复用专业 Agent
- ❌ 版本控制和协作困难

**提供方案**:
- ✅ **智能生成**: 使用 Codex/GLM 自动生成 Agent 配置
- ✅ **模板库**: 100+ 专业 Agent 模板（开发、营销、生产力等）
- ✅ **一键部署**: 自动配置并部署到 OpenClaw
- ✅ **版本控制**: Git 管理版本
- ✅ **社区分享**: 轻松分享和导入他人 Agent

---

## 📦 核心功能

### 1. Agent 生成器（AI 驱动）

**使用 Codex 或 GLM 根据自然语言描述生成完整 Agent 配置**

**示例**:
```bash
# 生成一个代码审查 Agent
./scripts/generate_agent.sh "请帮我创建一个专业的代码审查 Agent，要求：
- 专注于 Python 和 JavaScript
- 检查代码质量、安全性、性能
- 提供改进建议
" ./agents/development/code-reviewer
```

**生成内容**:
- `SOUL.md` - 角色定义
- `AGENTS.md` - 工作空间配置
- `USER.md` - 用户偏好
- `BOOTSTRAP.md` - 首次运行引导

---

### 2. Agent 模板库

**100+ 专业 Agent 模板，按场景分类**:

#### 生产力（Productivity）
- 🎯 **Orion** - 项目管理，任务协调
- 📊 **Pulse** - 数据分析，自动报告
- 🧍 **Standup** - 每日站会收集
- 📧 **Inbox** - 邮件分类和回复

#### 开发（Development）
- 🔎 **Lens** - 代码审查
- 📖 **Scribe** - 文档生成
- 🐛 **Trace** - Bug 追踪
- 🧪 **Probe** - API 测试

#### 营销（Marketing）
- ✍️ **Echo** - 内容创作
- 📱 **Buzz** - 社交媒体管理
- 🔍 **Rank** - SEO 优化
- 📬 **Digest** - Newsletter 策划

#### 业务（Business）
- 📊 **Radar** - 业务分析
- 🎧 **Compass** - 客户支持
- 💼 **Pipeline** - 销售助手
- 💰 **Ledger** - 发票跟踪

[查看完整模板库 →](./agents/)

---

### 3. Agent 管理器

**生命周期管理工具**

```bash
# 列出所有 Agent
./scripts/manage_agents.sh list

# 查看 Agent 配置
./scripts/manage_agents.sh view code-reviewer

# 更新 Agent
./scripts/manage_agents.sh update code-reviewer

# 删除 Agent
./scripts/manage_agents.sh delete code-reviewer
```

---

### 4. Agent 分享器

**轻松分享和导入**

```bash
# 分享 Agent 到 GitHub
./scripts/share_agent.sh code-reviewer

# 从 GitHub 导入 Agent
./scripts/import_agent.sh https://github.com/user/awesome-agent
```

---

### 5. Agent 测试器

**沙盒环境测试**

```bash
# 测试 Agent
./scripts/test_agent.sh code-reviewer

# 查看日志
./scripts/view_logs.sh code-reviewer
```

---

## 🚀 快速开始

### 安装

```bash
# 克隆仓库
git clone https://github.com/srxly888-creator/openclaw-agent-forge.git
cd openclaw-agent-forge

# 安装依赖
npm install

# 验证安装
./scripts/verify_installation.sh
```

### 使用

#### 方法 1: 使用 AI 生成（推荐）

```bash
# 生成新 Agent
./scripts/generate_agent.sh "描述你的 Agent 需求" ./agents/my-agent

# 部署到 OpenClaw
./scripts/deploy_agent.sh my-agent
```

#### 方法 2: 使用模板

```bash
# 从模板库选择
./scripts/use_template.sh productivity/project-manager ./agents/my-pm

# 自定义配置
vim ./agents/my-pm/SOUL.md

# 部署
./scripts/deploy_agent.sh my-pm
```

#### 方法 3: 导入他人 Agent

```bash
# 从 GitHub 导入
./scripts/import_agent.sh https://github.com/user/awesome-agent

# 部署
./scripts/deploy_agent.sh awesome-agent
```

---

## 📁 目录结构

```
openclaw-agent-forge/
├── README.md                  # 本文件
├── SKILL.md                   # OpenClaw Skill 定义
├── agents/                    # Agent 模板库
│   ├── productivity/          # 生产力 Agent
│   ├── development/           # 开发 Agent
│   ├── marketing/             # 营销 Agent
│   └── business/              # 业务 Agent
├── templates/                 # 模板库
│   ├── basic/                 # 基础模板
│   ├── advanced/              # 高级模板
│   └── specialized/           # 专用模板
├── scripts/                   # 工具脚本
│   ├── generate_agent.sh      # Agent 生成器
│   ├── deploy_agent.sh        # Agent 部署
│   ├── share_agent.sh         # Agent 分享
│   └── import_agent.sh        # Agent 导入
├── docs/                      # 文档
│   ├── getting-started.md     # 快速开始
│   ├── best-practices.md      # 最佳实践
│   └── examples.md            # 示例
└── tools/                     # 工具
    ├── codex-generator/       # Codex 生成器
    └── template-manager/      # 模板管理器
```

---

## 🔧 技术栈

- **生成器**: Codex / GLM-5
- **管理**: OpenClaw CLI
- **版本控制**: Git
- **分享**: GitHub

---

## 📚 参考资源

### Agent 模板库
- [Awesome OpenClaw Agents](https://github.com/mergisi/awesome-openclaw-agents) (1,782 stars)
- [OpenClaw Agents](https://github.com/shenhao-stu/openclaw-agents) (315 stars)

### Skill 库
- [Awesome OpenClaw Skills](https://github.com/VoltAgent/awesome-openclaw-skills) (41,266 stars)
- [Awesome OpenClaw Skills 中文](https://github.com/clawdbot-ai/awesome-openclaw-skills-zh) (3,545 stars)

### 记忆系统
- [EverMemOS](https://github.com/EverMind-AI/EverMemOS) (3,088 stars)

---

## 🤝 贡献

我们热烈欢迎任何形式的贡献！

**贡献方式**:
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

**贡献内容**:
- ✅ 分享你的专业 Agent
- ✅ 改进生成算法
- ✅ 完善文档
- ✅ 修复 Bug

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 📞 获取帮助

### 官方资源
- [OpenClaw 文档](https://docs.openclaw.ai)
- [OpenClaw GitHub](https://github.com/openclaw/openclaw)

### 社区支持
- [Stack Overflow](https://stackoverflow.com/)
- [GitHub Discussions](https://github.com/discussions)
- [Discord](https://discord.gg/openclaw)

---

## 🎯 路线图

### v1.0 (当前)
- ✅ 基础 Agent 生成器
- ✅ 10 个示例模板
- ✅ 基础管理脚本

### v2.0 (计划)
- ⏭️ 集成 Codex API
- ⏭️ 100+ 模板库
- ⏭️ Web UI 界面

### v3.0 (未来)
- ⏭️ AI Agent 市场
- ⏭️ 社区协作平台
- ⏭️ 自动化测试

---

**开始创建你的专业 AI Agent！** 🚀

**GitHub**: https://github.com/srxly888-creator/openclaw-agent-forge
