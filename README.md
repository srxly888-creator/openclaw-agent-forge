# OpenClaw Agent Forge

Security-first toolkit for building and maintaining OpenClaw agents.

## What This Repo Provides

- TypeScript CLI (`forge`) for agent scaffolding, security scanning, validation, and sync.
- Built-in security profile generator aligned with OpenClaw-style least-privilege principles.
- Bidirectional sync utility for Forge agent files and `~/.openclaw/agents/*/agent`.
- Starter SOUL templates under [`agents/`](./agents/).

## Quick Start

```bash
git clone https://github.com/srxly888-creator/openclaw-agent-forge.git
cd openclaw-agent-forge
npm install
npm run build
```

Run locally without global install:

```bash
npm run dev -- --help
```

Global command (optional):

```bash
npm link
forge --help
```

## CLI Commands

Create an agent scaffold:

```bash
forge create my-agent --scenario private-chat --security high
```

Create a swarm scaffold:

```bash
forge swarm create content-team --agents researcher,writer,editor
```

Run security scan:

```bash
forge scan .
```

Validate four-layer quality checks:

```bash
forge validate --four-layer --strict
```

Sync with OpenClaw:

```bash
forge sync my-agent --direction bidirectional
forge sync my-agent --watch
```

List agents:

```bash
forge list --scope both --format table
forge list --scope forge --format json
```

## Security Model

Security profiles are defined in [`src/security/sandbox-config.ts`](./src/security/sandbox-config.ts):

- `maximum`: docker + read-only workspace + no network.
- `high`: docker + restricted network + limited tools.
- `medium`: docker + read/write workspace + controlled execution.
- `low`: native + full network (main-session only).

Generate plugin security snippets programmatically:

```ts
import { selectSecurityProfile, generatePluginSecurityConfig } from 'openclaw-agent-forge';

const profile = selectSecurityProfile('public-chat');
const pluginConfig = generatePluginSecurityConfig(profile);
```

## Development

```bash
npm run build
npm run typecheck
npm run lint
npm test
```

## Repository Layout

```text
openclaw-agent-forge/
├── agents/                  # Starter templates
├── docs/                    # Guides
├── src/
│   ├── commands/forge.ts    # CLI entry
│   ├── security/            # Scanner + security profile utilities
│   └── sync/                # Forge <-> OpenClaw sync
├── SKILL.md
└── package.json
```

## License

MIT
