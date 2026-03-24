# Security Guide

This project is designed around least-privilege defaults for OpenClaw agent workflows.

**Security Architecture**: Based on [OpenClaw PR #51165 (Agent-Scoped Policy Parity)](https://github.com/openclaw/openclaw/pull/51165)

## Security Profiles

Defined in `src/security/sandbox-config.ts`:

- `maximum`: Docker sandbox, read-only workspace, no network.
- `high`: Docker sandbox, restricted network, limited tools.
- `medium`: Docker sandbox, read/write workspace, controlled tooling.
- `low`: Native mode for trusted main-session usage.

Pick profile by scenario:

```ts
import { selectSecurityProfile } from 'openclaw-agent-forge';

const profile = selectSecurityProfile('public-chat');
```

## Security Scanner

Run scanner against code/config:

```bash
forge scan .
forge scan ./agents/my-agent
```

Scanner currently checks:

- hardcoded secrets and tokens
- dangerous runtime functions (`eval`, `exec`, etc.)
- unsafe input handling patterns
- SQL injection-like string composition
- `SKILL.md` safety documentation gaps
- `openclaw.plugin.json` sandbox/allowlist weaknesses

## Plugin Configuration Hardening

Generate secure plugin snippets:

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

## Operational Recommendations

1. Never hardcode API keys in `SOUL.md`, `AGENTS.md`, source code, or plugin config.
2. Keep dangerous tools (`exec`, `browser`, `write`) deny-by-default.
3. Use `forge validate --strict` in CI before merge/release.
4. Rotate any credential immediately if scanner flags a real secret.
