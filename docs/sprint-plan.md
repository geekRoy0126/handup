# Sprint plan

Due date: **2026-11-13**. Two short sprints. Stories, acceptance criteria and estimates: `docs/PRD.md` §5.

## Who does what (decided 2026-11-10)

Because of the deadline, Ruoyu implements all 14 issues with AI assistance. Qingyu reviews PRs, tests the
deployed app, and contributes to the demo video, retros and documentation. The contribution log records what
each partner actually did.

## Sprint 1 — Nov 10 → Nov 11 · Goal: one full question loop works live and every PR deploys

| Issue | Points | Status |
| --- | --- | --- |
| #1 Scaffold, rules file and PRD | 2 | |
| #2 Deploy: Vercel + Neon + environments + preview E2E | 3 | |
| #3 US1 Host account | 3 | |
| #4 US2 Create session with join code | 3 | |
| #5 US3 Join and ask | 3 | |
| #6 US4 Upvote with live re-ranking | 5 | |
| #7 US5 Pin and mark answered | 2 | |

## Sprint 2 — Nov 12 → Nov 13 · Goal: moderation, polls, report, public API, docs

| Issue | Points | Status |
| --- | --- | --- |
| #8 US6 Moderators hide / unhide | 3 | |
| #9 US7 Merge duplicates | 3 | |
| #10 US8 Live polls | 5 | |
| #11 US9 Session report | 3 | |
| #12 US10 Public API + OpenAPI | 3 | |
| #13 Polish and accessibility | 2 | |
| #14 Documentation package and demo | 3 | |

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

- Single Next.js app on Vercel + Neon instead of Express + Socket.IO + Railway (see `docs/architecture.md`).
- Real time with Server-Sent Events + a version counter in Postgres instead of Pusher (PRD §4.7).
