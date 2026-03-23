# Agent Forge - OpenClaw Agent 管理工具

## 触发条件
- 用户提到 "创建 agent"、"管理 agent"、"agent 模板"
- 用户要求 "生成 SOUL.md"、"配置 agent"
- 用户提到 "分享 agent"、"导入 agent"
- 用户要求 "AI 生成 agent"、"智能 agent"

## 核心功能

### 1. Agent 生成器（AI 驱动）
使用 Codex 或 GLM 根据自然语言描述生成完整的 Agent 配置。

**使用示例**:
```
请帮我创建一个专业的代码审查 Agent，要求：
- 专注于 Python 和 JavaScript
- 检查代码质量、安全性、性能
- 提供改进建议
```

**生成内容**:
- `SOUL.md` - 角色定义
- `AGENTS.md` - 工作空间配置
- `USER.md` - 用户偏好
- `BOOTSTRAP.md` - 首次运行引导

### 2. Agent 模板库
提供 100+ 专业 Agent 模板，按场景分类：

**分类**:
- 生产力（Productivity）- 项目管理、数据分析
- 开发（Development）- 代码审查、测试
- 营销（Marketing）- 内容创作、SEO
- 业务（Business）- 客户支持、销售

### 3. Agent 管理器
管理所有 Agent 的生命周期：
- 列出所有 Agent
- 查看配置差异
- 批量更新
- 备份和恢复

### 4. Agent 分享器
将 Agent 打包为可分享的格式：
- 导出为 GitHub 仓库
- 导入他人分享的 Agent
- 版本控制

### 5. Agent 测试器
在沙盒环境中测试 Agent：
- 模拟对话
- 性能评估
- 日志分析

## 实现路径

### 路径 1: 使用 Codex 自动生成
**优势**: 智能化，可以根据需求定制
**步骤**:
1. 用户描述需求
2. Codex 生成 SOUL.md
3. 自动配置其他文件
4. 部署到 OpenClaw

### 路径 2: 使用模板库
**优势**: 快速，基于成熟模板
**步骤**:
1. 从模板库选择
2. 根据需求修改
3. 部署到 OpenClaw

### 路径 3: Git 仓库管理
**优势**: 版本控制，协作友好
**步骤**:
1. 创建 Git 仓库
2. 提交 Agent 配置
3. 分享给他人
4. 持续更新

## 使用示例

### 创建新 Agent
```
帮我创建一个专业的营销内容 Agent：
- 擅长写博客、社交媒体文案
- 支持 SEO 优化
- 了解内容营销最佳实践
```

### 导入他人 Agent
```
从 https://github.com/user/marketing-agent 导入 Agent
```

### 分享我的 Agent
```
将我的代码审查 Agent 分享到 GitHub
```

## 技术栈
- **生成器**: Codex / GLM-5
- **管理**: OpenClaw CLI
- **版本控制**: Git
- **分享**: GitHub

## 参考资源
- [Awesome OpenClaw Agents](https://github.com/mergisi/awesome-openclaw-agents)
- [OpenClaw 文档](https://docs.openclaw.ai)
- [GitHub 仓库](https://github.com/srxly888-creator/openclaw-agent-forge)
