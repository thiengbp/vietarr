# Contributing to VietArr

Thanks for helping improve VietArr. This project is phase-gated: behavior changes must fit the active block in [ROADMAP.md](ROADMAP.md) and the matching file under `docs/blocks/`.

## Development setup

Requirements:

- Node.js 22.
- Docker with Compose plugin for installer/integration work.
- Ubuntu 24.04 VM for release install validation.

Checks before opening a pull request:

```bash
cd core && npm ci && npm test && npm audit --omit=dev --audit-level=high
cd web && npm ci && npm run lint && npm run build && npm audit --omit=dev --audit-level=high
```

## Change rules

- Update `docs/API.md` before changing Core API behavior.
- Keep secrets only in `.env`; do not paste real API keys, tokens, cookies, passwords, or install reports with unredacted values.
- Do not change a released block interface without an accepted ADR.
- Keep UI text in Vietnamese and code/comments in English.
- Use conventional commit messages such as `fix:`, `feat:`, `docs:`, `chore:`.

## Pull request checklist

- [ ] The change is inside the active block scope.
- [ ] Docs were updated when behavior or install steps changed.
- [ ] Core checks pass, if `core/` changed.
- [ ] Web lint/build pass, if `web/` changed.
- [ ] No secrets were added to code, docs, logs, screenshots, or fixtures.
