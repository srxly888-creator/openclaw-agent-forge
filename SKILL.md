# OpenClaw Agent Forge Skill

## Trigger Conditions

Use this skill when user intent is about:

- creating or scaffolding an OpenClaw agent
- configuring sandbox/tool permissions
- scanning agent files for security issues
- validating repository quality with four-layer checks
- syncing agent config between Forge and OpenClaw

## Core Commands

```bash
forge create <agent-name> --scenario <scenario> --security <level>
forge swarm create <swarm-name> --agents <a,b,c>
forge scan [path]
forge validate --four-layer [--strict]
forge sync <agent-name> --direction <to-openclaw|from-openclaw|bidirectional> [--watch]
forge list --scope <forge|openclaw|both> --format <table|json>
```

## Tool Boundaries

- Read/write scope: current workspace and configured OpenClaw directory.
- Network/tooling: follow plugin sandbox profile; default to least privilege.
- Dangerous capabilities (`exec`, broad write, full network) require explicit rationale.

## Security Notes

- Never hardcode API keys in `SOUL.md`, source code, or plugin JSON.
- Prefer `maximum` or `high` security profile unless task requires otherwise.
- Run `forge scan` and `forge validate --strict` before shipping changes.

## Error Handling

- If command fails, surface clear actionable error messages.
- If JSON parsing fails during sync, stop and ask user to fix malformed files.
- In watch mode, log and continue on recoverable sync errors.
