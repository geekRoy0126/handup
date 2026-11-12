# AI-assisted development log

AI harness(es) used: _fill in honestly per entry_. All of them are guided by `AGENTS.md` (shared rules file).
This log is the evidence for the "AI Mastery" criterion: how we engineered context, how AI followed TDD, and
how the rules evolved. Add an entry for every issue (2–5 lines is enough).

## Context engineering we set up

| Technique | Where |
| --- | --- |
| Shared rules file with version traps for Next 16 / Prisma 7 / Tailwind 4 / zod 4 | `AGENTS.md` §1.2 |
| Single source of product rules the agent must cite | `docs/PRD.md` §4, referenced from every issue |
| Issues generated from the PRD so AC are identical everywhere | `scripts/setup-github.mjs` |
| Architecture and visibility rules as "only services import db" / "guest DTOs never contain…" | `AGENTS.md` §1.3 |
| TDD order enforced in rules + PR template asks for the failing output | `AGENTS.md` §3.4, `.github/pull_request_template.md` |
| Rules changelog with the reason for every change | `AGENTS.md` §8 |

## Standard prompt for a story

> Implement issue #N. Follow AGENTS.md §0: restate every AC as a checklist, then write failing tests only
> (unit for domain, integration for services/routes, E2E for the flow), run them and show the failure. Stop.
> — (after the `test(#N)` commit) — Now implement the smallest code to make them pass, then run lint, typecheck,
> unit and integration tests and report each AC as [x]/[ ].

## Log

| Date | Who | Issue | What the AI did | What we corrected | Rules change? |
| --- | --- | --- | --- | --- | --- |
| 2026-11-10 | Ruoyu | #1 | Ported HW3 rules to HandUp, drafted PRD rules, schema and CI workflows | Chose a single Next.js app over Express + Socket.IO for full-stack previews | AGENTS.md v2.0 |
| 2026-11-10 | Ruoyu | #1 | Replaced Pusher with SSE + version counter | Removes third-party secrets so CI can test real time | AGENTS.md v2.1 |
