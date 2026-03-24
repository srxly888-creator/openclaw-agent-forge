# Getting Started

## 1. Install

```bash
git clone https://github.com/srxly888-creator/openclaw-agent-forge.git
cd openclaw-agent-forge
npm install
npm run build
```

Optional global command:

```bash
npm link
forge --help
```

## 2. Create Your First Agent

```bash
forge create my-assistant --scenario private-chat --security high
```

This creates:

- `agents/my-assistant/SOUL.md`
- `agents/my-assistant/AGENTS.md`
- `agents/my-assistant/openclaw.plugin.json`
- `agents/my-assistant/SECURITY.md`

## 3. Scan for Security Issues

```bash
forge scan agents/my-assistant
```

The command writes a report to `security-scan-report.md` in the target directory.

## 4. Validate Repository Quality

```bash
forge validate --four-layer --strict
```

Checks include structure integrity, runtime stability, hidden risk detection, and developer experience.

## 5. Sync With OpenClaw

```bash
forge sync my-assistant --direction to-openclaw
forge sync my-assistant --direction from-openclaw
forge sync my-assistant --watch
```

Default OpenClaw path is `~/.openclaw`.

## 6. List Agents

```bash
forge list --scope both --format table
forge list --scope forge --format json
```
