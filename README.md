# OpenClaw Agent Forge

🦞 安全优先的 OpenClaw 智能体构建和维护工具包

---

## 概述

OpenClaw Agent Forge 是一个专注于安全的工具包，用于创建、配置和维护 OpenClaw 智能体。它提供了命令行工具（CLI）和编程接口，帮助开发者构建安全、可靠的智能体应用。

---

## 安装

```bash
npm install openclaw-agent-forge
# 或
yarn add openclaw-agent-forge
```

---

## 快速开始

### 1. 创建新智能体

```bash
forge create my-agent
```

### 2. 扫描安全问题

```bash
forge scan
```

### 3. 验证配置

```bash
forge validate --four-layer
```

---

## 核心功能

### 🔒 安全配置

智能体安全配置文件定义了智能体的权限和行为边界。安全配置文件在 [`src/security/sandbox-config.ts`](./src/security/sandbox-config.ts) 中定义:

- `maximum`: Docker + 只读工作空间 + 无网络
- `high`: Docker + 受限网络 + 有限工具
- `medium`: Docker + 读写工作空间 + 受控执行
- `low`: 原生环境 + 完整网络（仅限主会话）

### 🛠 智能体创建

使用 `forge create` 命令创建新的智能体脚手架：

```bash
forge create <智能体名称> [选项]
```

**选项**:
- `-t, --template <模板>`: 模板名称/路径（默认: basic）
- `-s, --security <级别>`: 安全级别（maximum|high|medium|low，默认: high）
- `--scenario <场景>`: 使用场景（public-chat|private-chat|main-session|subagent，默认: private-chat）

### 🔍 安全扫描

使用 `forge scan` 扫描智能体文件中的安全问题：

```bash
forge scan [路径]
```

扫描内容：
- 不安全的权限配置
- 潜在的注入风险
- 敏感信息泄露
- 不安全的网络访问

### ✅ 配置验证

使用 `forge validate` 验证智能体配置：

```bash
forge validate [选项]
```

**选项**:
- `--four-layer`: 使用四层安全模型验证
- `--strict`: 严格模式，所有警告视为错误

### 🔄 智能体同步

使用 `forge sync` 在 Forge 和 OpenClaw 之间同步智能体：

```bash
forge sync [选项]
```

**选项**:
- `-d, --direction <方向>`: 同步方向（to-openclaw|from-openclaw|bidirectional，默认: bidirectional）
- `--dry-run`: 模拟运行，不执行实际操作

### 📋 智能体列表

使用 `forge list` 列出所有智能体：

```bash
forge list [选项]
```

**选项**:
- `--scope <范围>`: 列出范围（forge|openclaw|both，默认: both）
- `--format <格式>`: 输出格式（json|table，默认: table）

---

## 编程接口

### 生成安全配置

以编程方式生成安全配置片段：

```ts
import { selectSecurityProfile, generatePluginSecurityConfig } from 'openclaw-agent-forge';

const profile = selectSecurityProfile('public-chat');
const pluginConfig = generatePluginSecurityConfig(profile);
```

### 扫描文件内容

扫描文件内容的安全问题：

```ts
import { scanFileContent } from 'openclaw-agent-forge';

const result = scanFileContent(fileContent, filePath);
if (result.issues.length > 0) {
  console.log('发现安全问题:', result.issues);
}
```

---

## 使用场景

### 场景 1: 公共聊天机器人

适用于公开的聊天服务，需要最高级别的安全限制：

```bash
forge create chatbot --scenario public-chat --security maximum
```

### 场景 2: 私有聊天助手

适用于内部使用的聊天助手，可以使用中等安全级别：

```bash
forge create assistant --scenario private-chat --security high
```

### 场景 3: 主会话智能体

适用于主会话中的智能体，需要完整权限：

```bash
forge create main-agent --scenario main-session --security low
```

### 场景 4: 子智能体

适用于由主智能体创建的子智能体：

```bash
forge create sub-agent --scenario subagent --security medium
```

---

## 开发指南

### 构建

```bash
npm run build
```

### 类型检查

```bash
npm run typecheck
```

### 代码检查

```bash
npm run lint
```

### 测试

```bash
npm test
```

---

## 项目结构

```
openclaw-agent-forge/
├── src/
│   ├── commands/          # CLI 命令
│   │   └── forge.ts       # 主命令入口
│   ├── security/          # 安全相关功能
│   │   ├── sandbox-config.ts  # 安全配置
│   │   └── ast-scanner.ts     # AST 扫描器
│   ├── sync/              # 同步功能
│   │   └── agent-sync.ts  # 智能体同步
│   └── tests/             # 测试文件
├── docs/                  # 文档
├── SKILL.md              # OpenClaw Skill 说明
├── package.json
└── README.md
```

---

## 最佳实践

### 1. 选择合适的安全级别

- **maximum**: 用于公开服务，完全不信任任何输入
- **high**: 用于半公开服务，需要限制网络访问
- **medium**: 用于内部服务，需要读写权限但限制危险操作
- **low**: 仅用于受信任的主会话

### 2. 定期扫描和验证

在每次更改智能体配置后，运行扫描和验证：

```bash
forge scan && forge validate --four-layer
```

### 3. 使用版本控制

将智能体配置纳入版本控制，并使用 `forge validate` 作为 CI/CD 的一部分。

### 4. 文档化安全决策

在智能体配置中添加注释，说明安全级别选择的原因。

---

## 故障排除

### 问题 1: 智能体创建失败

**症状**: `forge create` 命令失败

**解决方案**:
1. 检查是否有权限创建目录
2. 确保智能体名称有效（仅包含字母、数字、连字符）
3. 检查是否已存在同名智能体

### 问题 2: 扫描发现大量问题

**症状**: `forge scan` 报告许多问题

**解决方案**:
1. 逐个检查每个问题
2. 优先处理高优先级问题
3. 使用 `--strict` 模式重新验证
4. 更新配置以修复问题

### 问题 3: 同步失败

**症状**: `forge sync` 无法同步

**解决方案**:
1. 检查 OpenClaw 是否正在运行
2. 验证网络连接
3. 使用 `--dry-run` 模式测试
4. 检查权限配置

---

## 贡献指南

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解如何参与开发。

### 开发流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 代码规范

- 使用 TypeScript
- 遵循 ESLint 配置
- 添加单元测试
- 更新文档

---

## 许可证

MIT License - 查看 [LICENSE](LICENSE) 了解详情。

---

## 联系方式

- **Issues**: https://github.com/srxly888-creator/openclaw-agent-forge/issues
- **文档**: https://github.com/srxly888-creator/openclaw-agent-forge#readme

---

## 更新日志

### v2.1.0 (2026-03-24)
- 添加中文文档
- 改进安全扫描算法
- 优化同步性能

---

**用 OpenClaw Agent Forge 构建安全的智能体！** 🦞
