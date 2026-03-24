# OpenClaw Agent Forge

面向 OpenClaw 的智能体工程工具箱，默认中文文档与中文 CLI 体验。

**安全架构来源**: [OpenClaw PR #51165（Agent-Scoped Policy Parity）](https://github.com/openclaw/openclaw/pull/51165)

## 这个仓库能做什么

- 提供 TypeScript CLI（`forge`），用于创建智能体、扫描安全问题、四层校验和双向同步。
- 内置安全配置生成器，遵循最小权限原则。
- 支持 Forge 与 `~/.openclaw/agents/*/agent` 的双向配置同步。
- 提供基础 SOUL 模板（见 `agents/`）。

## 快速开始

```bash
git clone https://github.com/srxly888-creator/openclaw-agent-forge.git
cd openclaw-agent-forge
npm install
npm run build
```

本地直接运行（无需全局安装）：

```bash
npm run dev -- --help
```

可选全局命令：

```bash
npm link
forge --help
```

## 常用命令

创建智能体：

```bash
forge create my-agent --scenario private-chat --security high
```

创建协作组：

```bash
forge swarm create content-team --agents researcher,writer,editor
```

安全扫描：

```bash
forge scan .
```

四层标准校验：

```bash
forge validate --four-layer --strict
```

与 OpenClaw 同步：

```bash
forge sync my-agent --direction bidirectional
forge sync my-agent --watch
```

列出智能体：

```bash
forge list --scope both --format table
forge list --scope forge --format json
```

## 安全模型

安全配置定义在 `src/security/sandbox-config.ts`：

- `maximum`：Docker + 只读工作区 + 禁网。
- `high`：Docker + 受限网络 + 限制工具。
- `medium`：Docker + 可写工作区 + 受控执行能力。
- `low`：Native + 全网络（仅主会话）。

可通过 API 生成插件安全片段：

```ts
import { selectSecurityProfile, generatePluginSecurityConfig } from 'openclaw-agent-forge';

const profile = selectSecurityProfile('public-chat');
const pluginConfig = generatePluginSecurityConfig(profile);
```

## 开发命令

```bash
npm run build
npm run typecheck
npm run lint
npm test
```

## 目录结构

```text
openclaw-agent-forge/
├── agents/                  # 模板智能体
├── docs/                    # 中文文档
├── src/
│   ├── commands/forge.ts    # CLI 入口
│   ├── security/            # 扫描器与安全配置
│   └── sync/                # Forge <-> OpenClaw 同步
├── SKILL.md
└── package.json
```

## 许可证

MIT
