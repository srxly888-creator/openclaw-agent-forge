# Best Practices

## 1. Keep Agent Scope Narrow

Each agent should own a clear responsibility. Avoid "do-everything" roles.

## 2. Prefer Least Privilege

- Start from `maximum` or `high` security profile.
- Add permissions only when required by a concrete task.
- Keep dangerous tools deny-by-default.

## 3. Make Behavior Auditable

- Document agent boundaries in `SOUL.md`.
- Keep operational constraints in `AGENTS.md`.
- Store plugin permissions in `openclaw.plugin.json`.

## 4. Validate Before Shipping

Run these checks before merge/deploy:

```bash
forge scan .
forge validate --four-layer --strict
```

## 5. Keep Sync Safe

- Use one source of truth per change window to avoid overwrites.
- Use `--watch` only when both sides are stable and monitored.
- Verify `models.json` and `auth-profiles.json` after major edits.

## 6. Protect Secrets

- Never commit API keys or tokens.
- Use environment variables for runtime credentials.
- Rotate keys immediately if scanner reports a real exposure.
