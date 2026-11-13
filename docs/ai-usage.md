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
| 2026-11-10 | Ruoyu | #1 | Fixed CI: regenerated the lockfile on Linux (npm optional-dependency bug), gitleaks permissions, GHAS jobs only on public repos | A lockfile built on Windows broke `npm ci` on Linux | — |
| 2026-11-10 | Ruoyu | #3 | Failing tests for tokens, validation, auth routes and E2E first; then jose/bcrypt auth, cookies, proxy | jose fails under jsdom → `@vitest-environment node`; Next's route announcer also has `role=alert` → narrowed the locator | — |
| 2026-11-10 | Ruoyu | #4 | Join-code domain with injected randomness; access helpers; sessions API and UI | Guests calling staff endpoints got 401 but the PRD says 403 → `denied()` tells them apart | — |
| 2026-11-10 | Ruoyu | #5 | `toQuestionView` visibility function, database rate limit, join/ask routes, guest board | A test helper read a response body twice; E2E timeouts under `next dev` + bcrypt → 15 s expect timeout | — |
| 2026-11-10 | Ruoyu | #6 | `rankQuestions`, vote toggle, `Session.version` migration, SSE route and hook | Factory tokens were signed at the fixed test date and would expire in CI → real clock | v2.2 |
| 2026-11-10 | Ruoyu | #7–#8 | Pure `planQuestionAction`; moderators API and panel; hide/unhide | — | — |
| 2026-11-10 | Ruoyu | #9 | `mergeVotes` and the merge route | The E2E exposed a race (a vote cast during a merge was lost). The first fix (SERIALIZABLE) was rejected on review because every vote updates the same session row → row locks + a concurrent regression test | v2.2 |
| 2026-11-10 | Ruoyu | #10 | Largest-remainder poll results, polls API, host panel and guest card | — | — |
| 2026-11-10 | Ruoyu | #11–#12 | Report builder + Markdown; hash-only API keys, public API with CORS, generated OpenAPI 3.1, Swagger UI | Added an OpenAPI coverage test so new routes cannot go undocumented | — |
| 2026-11-10 | Ruoyu | #13–#14 | axe checks, large-text mode, README screenshots captured with Playwright | Screenshots showed duplicate guests (StrictMode joined twice) → `joinOnce` fix | — |

## Lessons that changed the rules file

See AGENTS.md §8 (v2.1, v2.2): SSE instead of Pusher; wait for server-confirmed state in multi-browser E2E; exact
label locators; real-clock tokens in test factories; row locks for concurrent writes; UTF-8 without BOM.
