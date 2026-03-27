# 安全指南

本项目默认遵循 OpenClaw 的最小权限安全策略。

**安全架构参考**: [OpenClaw PR #51165（Agent-Scoped Policy Parity）](https://github.com/openclaw/openclaw/pull/51165)

## 安全配置等级

定义位置：`src/security/sandbox-config.ts`

- `maximum`：Docker 沙箱 + 只读工作区 + 禁网。
- `high`：Docker 沙箱 + 受限网络 + 限制工具权限。
- `medium`：Docker 沙箱 + 可写工作区 + 受控执行能力。
- `low`：Native 模式（仅适用于可信主会话）。

按场景选择配置：

```ts
import { selectSecurityProfile } from 'openclaw-agent-forge';

const profile = selectSecurityProfile('public-chat');
```

## 安全扫描器

扫描代码与配置：

```bash
forge scan .
forge scan ./agents/my-agent
```

扫描命令会在目标目录生成 `security-scan-report.md`。如果发现 critical / high 问题，命令会返回非零退出码；`--fix` 目前只是预留参数，不会自动修改文件。

当前扫描覆盖：

- 硬编码密钥与 Token
- 危险函数调用（`eval`、`exec` 等）
- 不安全输入处理
- SQL 注入式拼接风险
- `SKILL.md` 安全文档缺失项
- `openclaw.plugin.json` 沙箱与白名单风险

## 插件配置加固

可通过 API 生成并校验安全片段：

```ts
import {
  selectSecurityProfile,
  generatePluginSecurityConfig,
  validateSecurityConfig,
} from 'openclaw-agent-forge';

const config = selectSecurityProfile('private-chat');
const pluginConfig = generatePluginSecurityConfig(config);
const validation = validateSecurityConfig(config);
```

## 运维建议

1. 禁止在 `SOUL.md`、`AGENTS.md`、源码、插件配置中硬编码密钥。
2. 危险工具（`exec`、`browser`、`write`）默认拒绝，按需放开。
3. 在 CI 中执行 `forge validate --strict` 作为合并门禁。
4. 一旦扫描发现真实泄露，立即轮换凭证并追溯影响范围。
