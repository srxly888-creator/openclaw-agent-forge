# 🤖 OpenClaw Agent Forge

<div align="center">

![OpenClaw Agent Forge](https://img.shields.io/badge/OpenClaw-Agent%20Forge-blue)
![Version](https://img.shields.io/badge/version-2.0.0-green)
![Security](https://img.shields.io/badge/security-first-red)
![Stars](https://img.shields.io/github/stars/srxly888-creator/openclaw-agent-forge?style=social)
![License](https://img.shields.io/github/license/srxly888-creator/openclaw-agent-forge)
![Issues](https://img.shields.io/github/issues/srxly888-creator/openclaw-agent-forge)

**🦞 Secure AI Agent Forge - Security-First Infrastructure Compiler**

**基于 PR #51165 智能体级别策略隔离**

[English](#english) | [中文](#中文) | [安全指南](docs/SECURITY_GUIDE.md)

</div>

---

## 中文

### 🚀 简介

OpenClaw Agent Forge 是一个专业的 AI Agent 工具包，帮助您快速创建具有技能的专业 Agent。

**核心理念**: **轻 Prompt + 重 Skill**
- Prompt 是岗位职责
- Skill 是手脚（具体能力）
- LLM 是协调者

### ✨ 特性

#### 🆕 v2.0 新特性

- 🔐 **安全默认机制** - 基于 PR #51165 的智能体级别策略隔离
- 🔍 **静态分析扫描器** - 自动检测 API 密钥泄露、危险函数等
- 🤖 **多智能体集群** - 一键创建协同工作的智能体群组
- 📋 **四层标准验证** - 确保符合 OpenClaw 生态标准
- 🚀 **一键部署** - 自动生成 Docker/Nginx/SSL 配置

#### 原有特性

- ✅ **10 个预构建 Agent**（研究助理、邮件管理、会议安排等）
- ✅ **40+ 即用技能**（带完整代码示例）
- ✅ **多模型支持**（LiteLLM + GLM-5 + DeepSeek）
- ✅ **100% 开源**（MIT License）
- ✅ **易于扩展**（标准输入输出格式）

### 📊 架构

```
用户请求
    ↓
Agent（轻 Prompt）
    ↓
LLM（Claude/GLM-5/DeepSeek）
    ↓
Skill 选择（Tools Schema）
    ↓
Skill 执行（Python 代码）
    ↓
响应
```

### 🎯 快速开始

#### 1. 安装依赖

```bash
pip install litellm
```

#### 2. 创建第一个 Agent

```python
from openclaw_agent_forge import Agent

# 创建研究助理
researcher = Agent("research-assistant")

# 搜索文献
papers = researcher.literature_search("AI memory systems", max_results=10)

# 总结论文
summary = researcher.summarize_paper(papers[0]["url"])

# 生成报告
report = researcher.generate_report(
    data={"papers": papers, "summary": summary},
    template="academic"
)

print(report["report_path"])
```

### 🤖 预构建 Agent

| Agent | 用途 | 技能数 | 状态 |
|-------|------|--------|------|
| Research Assistant | 研究助理 | 4 | ✅ |
| Email Manager | 邮件管理 | 3 | ✅ |
| Meeting Scheduler | 会议安排 | 4 | ✅ |
| Social Media Manager | 社媒运营 | 5 | ✅ |
| Learning Coach | 学习教练 | 4 | ✅ |
| Code Reviewer | 代码审查 | 3 | ✅ |
| Content Creator | 内容创作 | 3 | ✅ |
| Data Analyst | 数据分析 | 3 | ✅ |
| Financial Analyst | 财务分析 | 4 | ⏳ |
| Health Advisor | 健康顾问 | 3 | ⏳ |

### 📚 完整示例

#### 示例 1: 研究助理

```python
from openclaw_agent_forge import Agent

# 创建研究助理
researcher = Agent("research-assistant")

# 1. 搜索文献
papers = researcher.literature_search("AI memory systems", max_results=10)
print(f"找到 {len(papers)} 篇论文")

# 2. 总结第一篇论文
summary = researcher.summarize_paper(papers[0]["url"])
print(f"论文标题: {summary['title']}")
print(f"主要贡献: {summary['main_contributions']}")

# 3. 生成研究报告
report = researcher.generate_report(
    data={"papers": papers, "summary": summary},
    template="academic"
)
print(f"报告路径: {report['report_path']}")
```

#### 示例 2: 会议安排

```python
from openclaw_agent_forge import Agent

# 创建会议安排
scheduler = Agent("meeting-scheduler")

# 1. 查找共同空闲时间
slots = scheduler.find_common_slots(
    attendees=["ou_xxx", "ou_yyy"],
    duration=60,
    date_range={"start": "2026-03-25", "end": "2026-03-26"}
)

# 2. 创建会议
meeting = scheduler.create_meeting(
    title="项目讨论",
    attendees=["ou_xxx", "ou_yyy"],
    time=slots[0],
    location="会议室 A"
)

# 3. 发送邀请
scheduler.send_invitation(meeting["event_id"], "请准时参加")
```

### 🛠️ 自定义 Skill

```python
from openclaw_agent_forge import Skill

# 定义自定义 Skill
@Skill(
    name="custom_search",
    description="自定义搜索功能",
    parameters={
        "query": {"type": "string", "description": "搜索关键词"},
        "limit": {"type": "integer", "default": 10}
    }
)
def custom_search(query: str, limit: int = 10):
    """自定义搜索实现"""
    # 实现搜索逻辑
    results = [...]
    
    return {
        "success": True,
        "data": results
    }

# 添加到 Agent
agent.add_skill(custom_search)
```

### 📦 项目结构

```
openclaw-agent-forge/
├── agents/
│   ├── research-assistant/
│   │   ├── config.json
│   │   ├── skills/
│   │   └── README.md
│   ├── email-manager/
│   └── ...
├── skills/
│   ├── literature_search.py
│   ├── summarize_paper.py
│   └── ...
├── examples/
│   ├── research_assistant_demo.py
│   ├── meeting_scheduler_demo.py
│   └── ...
├── docs/
│   ├── GETTING_STARTED.md
│   ├── CUSTOM_SKILLS.md
│   └── API_REFERENCE.md
├── tests/
├── README.md
├── LICENSE
└── requirements.txt
```

### 🔧 配置

#### LiteLLM 配置

```python
import litellm

# 配置 API Keys
litellm.api_key = "your-api-key"

# 或使用环境变量
# export OPENAI_API_KEY="your-key"
# export ANTHROPIC_API_KEY="your-key"
```

#### GLM-5 配置

```python
from zhipuai import ZhipuAI

client = ZhipuAI(api_key="your-glm-api-key")
```

### 📈 性能优化

| 模型 | 成本/100 次 | 延迟 | 质量 |
|------|------------|------|------|
| Claude-3.5-Sonnet | $5-25 | 1-2s | ⭐⭐⭐⭐⭐ |
| GLM-5 | $0.5-2 | 0.5-1s | ⭐⭐⭐⭐ |
| DeepSeek | $0.02-0.1 | 0.3-0.8s | ⭐⭐⭐ |

### 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md)

### 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

### 🔗 相关资源

- **OpenClaw 官网**: https://openclaw.ai
- **文档**: https://docs.openclaw.ai
- **Discord**: https://discord.com/invite/clawd
- **GitHub**: https://github.com/openclaw/openclaw

---

## English

### 🚀 Introduction

OpenClaw Agent Forge is a professional AI Agent toolkit that helps you quickly create skilled professional agents.

**Core Philosophy**: **Light Prompts + Heavy Skills**
- Prompts are job responsibilities
- Skills are hands and feet (specific capabilities)
- LLM is the coordinator

### ✨ Features

- ✅ **10 Pre-built Agents** (Research Assistant, Email Manager, Meeting Scheduler, etc.)
- ✅ **40+ Ready-to-use Skills** (with full code examples)
- ✅ **Multi-model Support** (LiteLLM + GLM-5 + DeepSeek)
- ✅ **100% Open Source** (MIT License)
- ✅ **Easy to Extend** (Standard input/output format)

### 🎯 Quick Start

```python
from openclaw_agent_forge import Agent

# Create a research assistant
researcher = Agent("research-assistant")

# Search literature
papers = researcher.literature_search("AI memory systems", max_results=10)

# Summarize paper
summary = researcher.summarize_paper(papers[0]["url"])

# Generate report
report = researcher.generate_report(
    data={"papers": papers, "summary": summary},
    template="academic"
)
```

### 📊 Architecture

```
User Request
    ↓
Agent (Light Prompt)
    ↓
LLM (Claude/GLM-5/DeepSeek)
    ↓
Skill Selection (Tools Schema)
    ↓
Skill Execution (Python Code)
    ↓
Response
```

### 🤝 Contributing

Contributions are welcome! Please check [CONTRIBUTING.md](CONTRIBUTING.md)

### 📄 License

MIT License - See [LICENSE](LICENSE)

---

<div align="center">

**Made with ❤️ by OpenClaw Community**

[⬆ Back to Top](#-openclaw-agent-forge)

</div>
