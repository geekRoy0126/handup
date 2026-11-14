# Sprint plan

Due date: **2026-11-13**. Two short sprints. Stories, acceptance criteria and estimates: `docs/PRD.md` §5.

## Who does what (decided 2026-11-10)

Because of the deadline, Ruoyu implements all 14 issues with AI assistance. Qingyu reviews PRs, tests the
deployed app, and contributes to the demo video, retros and documentation. The contribution log records what
each partner actually did.

**Update 2026-11-12 (Qingyu):** while reviewing #15–#29 I found bugs worth fixing before the deadline (an open
redirect, races that answered 500, a rate limit that a burst could bypass, CodeQL skipped on the private repo).
I opened an issue for each and fixed it test-first in my own PRs; they are added to Sprint 2 below. Statuses
below are as of Nov 12.

## Sprint 1 — Nov 10 → Nov 11 · Goal: one full question loop works live and every PR deploys

| Issue | Points | Status |
| --- | --- | --- |
| #1 Scaffold, rules file and PRD | 2 | Done, PR #15 merged |
| #2 Deploy: production + PR previews (VPS) | 3 | Done on Nov 13 (PRs #29, #74): production and PR previews deploy automatically from GitHub Actions |
| #3 US1 Host account | 3 | Done, PR #17 merged |
| #4 US2 Create session with join code | 3 | Done, PR #18 merged |
| #5 US3 Join and ask | 3 | Done, PR #19 merged |
| #6 US4 Upvote with live re-ranking | 5 | Done, PR #20 merged |
| #7 US5 Pin and mark answered | 2 | Done, PR #21 merged |

## Sprint 2 — Nov 12 → Nov 13 · Goal: moderation, polls, report, public API, docs

| Issue | Points | Status |
| --- | --- | --- |
| #8 US6 Moderators hide / unhide | 3 | Done, PR #22 merged |
| #9 US7 Merge duplicates | 3 | Done, PR #23 merged |
| #10 US8 Live polls | 5 | Done, PR #24 merged |
| #11 US9 Session report | 3 | Done, PR #25 merged |
| #12 US10 Public API + OpenAPI | 3 | Done, PR #26 merged |
| #13 Polish and accessibility | 2 | Done, PR #27 merged |
| #14 Documentation package and demo | 3 | Done, PR #28 merged |
| #40 Review fixes: open redirect, double-vote 500, auth tests (Qingyu) | 2 | PR #41 open for review |
| #42 Auth hardening: duplicate-email race, login timing (Qingyu) | 1 | PR #47 open for review |
| #43 Join codes: crypto randomness, collision retry (Qingyu) | 1 | PR #48 open for review |
| #44 Rate limit under concurrent requests (Qingyu) | 2 | PR #49 open for review |
| #45 SSE first-connect gap, copy-link feedback (Qingyu) | 2 | PR #50 open for review |
| #46 CI: Semgrep SAST, E2E reuses the build (Qingyu) | 2 | PR #51 open for review |
| #52 Qingyu's standups | 1 | PR #53 open for review |
| #54 Qingyu's parts of the docs package | 1 | This PR |

## Dependencies (merge order)

`#1 → #3 → #4 → #5 → #6 → #7 → #8 → #9 → #10 → #11 → #12 → #13 → #14`. #2 runs in parallel once #1 is on `main`.

## Working agreement

- Every issue: branch → `test(#n)` failing commit → `feat(#n)` → PR with CI green → merge (never squash).
- The partner reviews PRs with at least one concrete comment.
- Standups in `docs/standups/sprint-N.md`: each partner writes and commits their own entries.
- A story that is not Done by the sprint's last day moves to the next sprint in the retro, with the reason.

## Cut list (if we fall behind, cut in this order)

1. #13 presenter large-type toggle (keep the accessibility checks)
2. #9 merge picker → a plain select
3. Never cut: auth, real time, 3 roles, public API + docs, TDD commits, E2E, CI/CD.

## Decisions

- Single Next.js app instead of Express + Socket.IO + Railway (see `docs/architecture.md`).
- Nov 13: deployed to our own VPS (systemd + Caddy) instead of Vercel + Neon; previews use one slot with a fresh database.
- Real time with Server-Sent Events + a version counter in Postgres instead of Pusher (PRD §4.7).
