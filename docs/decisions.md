# Decision log

Log every non-trivial decision here: newest at the bottom, one row per decision.

| Date | Decision | Reason | Alternatives | Phase |
|---|---|---|---|---|
| 2026-10-22 | Product name is Mailnitio (not MailCart); Helpdesk native first, Middleware mode via POC | Agreed in planning | - | Planning |
| 2026-10-22 | `main` is protected by convention: all changes go through a branch and a pull request, tested before merge | Keep production stable; every change reviewed and tested in isolation | Direct pushes to `main` | Planning |
| 2026-10-22 | Design system kept in one file (`docs/design-system.md`) and imported into `CLAUDE.md` with `@docs/design-system.md` | One source of truth; no drift between two copies | Inline the full design system in `CLAUDE.md` | Planning |
