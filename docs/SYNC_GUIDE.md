# Sync Guide

Agent Forge supports bidirectional sync with OpenClaw agent config files.

## Paths

- Forge side: `./agents/<agent-name>/`
- OpenClaw side: `~/.openclaw/agents/<agent-name>/agent/`

## Commands

Push Forge config to OpenClaw:

```bash
forge sync my-agent --direction to-openclaw
```

Pull OpenClaw config back to Forge:

```bash
forge sync my-agent --direction from-openclaw
```

Run both directions in sequence:

```bash
forge sync my-agent --direction bidirectional
```

Watch mode for continuous sync:

```bash
forge sync my-agent --watch
```

## File Mapping

- `SOUL.md` -> `models.json`
- `AGENTS.md` -> `auth-profiles.json`

## Notes

1. `--watch` requires both paths to exist before startup.
2. `models.json` must contain at least one provider and one model entry.
3. API keys should come from environment variables, not committed files.

## Troubleshooting

Agent not found:

```bash
ls ./agents/my-agent
ls ~/.openclaw/agents/my-agent/agent
```

Invalid JSON error:

```bash
cat ~/.openclaw/agents/my-agent/agent/models.json | jq .
cat ~/.openclaw/agents/my-agent/agent/auth-profiles.json | jq .
```
