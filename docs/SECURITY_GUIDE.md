# OpenClaw Agent Forge v2.0

> 🦞 **安全的智能体锻造工具** - 基于 PR #51165 安全架构

## 🚀 新特性（v2.0）

### 🔐 安全默认机制

**自动生成安全配置**，基于 OpenClaw PR #51165 的智能体级别策略隔离：

```typescript
import { selectSecurityProfile, generateSecurityDocs } from './security/sandbox-config';

// 根据场景自动选择安全配置
const config = selectSecurityProfile('public-chat');

// 生成安全文档
const docs = generateSecurityDocs(config);
```

**预定义安全配置**：
- **Maximum** - 群聊、公开渠道（Docker + 只读 + 无网络）
- **High** - 敏感数据处理（Docker + 受限网络）
- **Medium** - 一般任务（Docker + 读写 + 受限网络）
- **Low** - 主会话（Native + 完全权限）

### 🔍 静态分析扫描器

**自动检测安全隐患**：

```bash
# 扫描当前目录
forge scan

# 扫描指定目录
forge scan ./my-agent
```

**检测内容**：
- ✅ 硬编码 API 密钥（OpenAI, Anthropic, GitHub, AWS 等）
- ✅ 危险函数使用（eval, exec, spawn 等）
- ✅ 不安全的输入处理
- ✅ SQL 注入风险
- ✅ 配置文件安全检查

### 🤖 多智能体集群

**一键创建智能体集群**：

```bash
# 创建内容引擎集群
forge swarm create content-engine --agents researcher,writer,designer,publisher
```

**生成结构**：
```
.agents/
├── researcher/
│   ├── agent.md
│   └── soul.md
├── writer/
│   ├── agent.md
│   └── soul.md
└── swarm.json
```

### 📋 四层标准验证

**验证是否符合 OpenClaw 生态标准**：

```bash
forge validate --four-layer
```

**四层标准**：
1. **规范清晰度与结构完整性** - SKILL.md 完整性检查
2. **运行稳定性** - 异常处理检查
3. **零隐蔽风险** - 数据外泄检查
4. **低遗憾体验** - 用户满意度检查

### 🚀 一键部署

**部署到生产环境**：

```bash
# 部署到 VPS
forge deploy --env vps --provider digitalocean --domain myagent.example.com

# 部署到云端
forge deploy --env cloud --provider aws
```

**生成文件**：
- `docker-compose.yml`
- `nginx.conf`
- `deploy.sh`
- `tailscale.conf`（零信任网络）

---

## 📦 安装

```bash
# 克隆仓库
git clone https://github.com/srxly888-creator/openclaw-agent-forge
cd openclaw-agent-forge

# 安装依赖
npm install

# 编译
npm run build

# 全局安装
npm link
```

---

## 🎯 快速开始

### 1. 创建安全智能体

```bash
# 创建用于公开群聊的智能体（最高安全级别）
forge create my-public-bot --scenario public-chat

# 创建用于私聊的智能体
forge create my-private-bot --scenario private-chat

# 创建主会话智能体（完全权限）
forge create my-main-bot --scenario main-session
```

### 2. 扫描安全问题

```bash
# 扫描现有代码
forge scan ./my-agent

# 查看详细报告
cat ./my-agent/security-scan-report.md
```

### 3. 创建智能体集群

```bash
# 创建研究集群
forge swarm create research-team \
  --agents literature-searcher,data-analyst,report-writer

# 创建营销集群
forge swarm create marketing-team \
  --agents content-creator,seo-optimizer,social-media-manager
```

### 4. 验证四层标准

```bash
# 验证智能体是否符合标准
forge validate --four-layer --strict
```

### 5. 部署到生产环境

```bash
# 部署到 VPS
forge deploy --env vps --domain bot.example.com

# 运行部署脚本
./deploy.sh
```

---

## 📚 API 参考

### 安全配置 API

```typescript
import {
  selectSecurityProfile,
  generatePluginSecurityConfig,
  validateSecurityConfig,
  generateSecurityDocs
} from 'openclaw-agent-forge';

// 选择安全配置
const config = selectSecurityProfile('public-chat');

// 生成插件配置片段
const pluginConfig = generatePluginSecurityConfig(config);

// 验证配置
const validation = validateSecurityConfig(config);
console.log(validation.warnings); // 查看警告
console.log(validation.errors);   // 查看错误

// 生成文档
const docs = generateSecurityDocs(config);
```

### 静态分析 API

```typescript
import {
  scanFileContent,
  scanSkillFile,
  scanPluginConfig,
  generateScanReport
} from 'openclaw-agent-forge';

// 扫描代码文件
const codeScan = scanFileContent(content, 'path/to/file.ts');

// 扫描 SKILL.md
const skillScan = scanSkillFile(content, 'path/to/SKILL.md');

// 扫描插件配置
const pluginScan = scanPluginConfig(content, 'path/to/openclaw.plugin.json');

// 生成报告
const report = generateScanReport([codeScan, skillScan, pluginScan], 'My Project');
```

---

## 🔧 配置示例

### 公开群聊智能体（最高安全）

```json
{
  "sandbox": {
    "mode": "docker",
    "image": "openclaw/sandbox:latest",
    "workspace": "ro",
    "network": "none"
  },
  "tools": {
    "allow": ["read", "web_search", "web_fetch"],
    "deny": ["exec", "browser", "edit", "write"]
  },
  "modes": "non-main"
}
```

### 主会话智能体（完全权限）

```json
{
  "sandbox": {
    "mode": "native"
  },
  "tools": {
    "allow": ["*"],
    "deny": []
  },
  "modes": "main"
}
```

---

## 📊 对比传统方式

### 传统方式（手动配置）

```json
{
  "tools": ["exec", "browser", "read", "write"],
  "permissions": "global"
}
```

**问题**：
- ❌ 无沙箱隔离
- ❌ 全局权限（所有智能体共享）
- ❌ 无安全验证
- ❌ 容易配置错误

### Agent Forge 方式（安全默认）

```bash
forge create my-bot --scenario public-chat
```

**生成**：
- ✅ Docker 沙箱配置
- ✅ 细粒度权限控制
- ✅ 自动安全扫描
- ✅ 四层标准验证

---

## 🎓 最佳实践

### 1. 始终使用场景化配置

```bash
# ✅ 好的做法
forge create bot --scenario public-chat

# ❌ 不好的做法（手动配置容易出错）
```

### 2. 定期安全扫描

```bash
# 每次部署前扫描
forge scan && forge validate --four-layer
```

### 3. 使用智能体白名单

```json
{
  "agents": {
    "allowed": ["agent-id-1", "agent-id-2"]
  }
}
```

### 4. 修复所有高危问题

```bash
# 扫描报告中的 Critical 和 High 问题必须修复
forge scan
cat security-scan-report.md
```

---

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md)

**优先改进方向**：
1. 多智能体编排（A2A 通信）
2. 记忆架构集成（Mem0, MemTensor）
3. 企业级部署（Kubernetes）
4. 自我进化机制（类似 Foundry）

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

---

## 🔗 相关资源

- **OpenClaw 官网**: https://openclaw.ai
- **PR #51165**: 智能体级别策略隔离
- **Foundry**: https://github.com/lekt9/openclaw-foundry
- **SeraphyAgent**: https://github.com/omnimasudo-seraphyagent-create-plugin
- **ClawHub**: https://clawhub.com

---

<div align="center">

**Made with ❤️ by OpenClaw Community**

**安全第一，智能体锻造新标准**

</div>
