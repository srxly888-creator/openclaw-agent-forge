# 快速开始

## 1. 安装

```bash
git clone https://github.com/srxly888-creator/openclaw-agent-forge.git
cd openclaw-agent-forge
npm install
npm run build
```

可选全局命令：

```bash
npm link
forge --help
```

## 2. 创建第一个智能体

```bash
forge create my-assistant --scenario private-chat --security high
```

会生成以下文件：

- `agents/my-assistant/SOUL.md`
- `agents/my-assistant/AGENTS.md`
- `agents/my-assistant/openclaw.plugin.json`
- `agents/my-assistant/SECURITY.md`

## 3. 扫描安全问题

```bash
forge scan agents/my-assistant
```

扫描报告会写入目标目录下的 `security-scan-report.md`。
如果发现 critical / high 问题，命令会返回非零退出码；`--fix` 目前只是预留参数。

## 4. 执行四层校验

```bash
forge validate --four-layer --strict
```

校验项包括：结构完整性、运行稳定性、隐蔽风险、开发体验。

## 5. 与 OpenClaw 同步

```bash
forge sync my-assistant --direction to-openclaw
forge sync my-assistant --direction from-openclaw
forge sync my-assistant --direction bidirectional
forge sync my-assistant --watch
```

默认 OpenClaw 路径：`~/.openclaw`。
`--watch` 会在首次同步完成后持续监听变更，适合反复调整智能体配置时使用。

## 6. 查看智能体列表

```bash
forge list --scope both --format table
forge list --scope forge --format json
forge list --scope openclaw --format table
```
