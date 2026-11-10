# Sprint plan

Planned jointly by Ruoyu Wang and Qingyu Cheng on 2026-11-10 (planning meeting notes at the bottom).
Velocity guess: ~10 points per person per sprint. Stories, AC and estimates: `docs/PRD.md` §5.

## Sprint 1 — Nov 11 → Nov 13 · Goal: one full question loop works live and every PR deploys

| Day | Ruoyu | Qingyu |
| --- | --- | --- |
| Tue 11/10 | #1 scaffold, rules, PRD, CI (done) · push repo · run setup script | Accept invite · review #1 PR · create Vercel/Neon/Pusher accounts |
| Wed 11/11 | #3 Host account (auth helpers `requireUser`, `requireHost` used by everyone) | #2 Vercel + Neon previews + env vars + preview E2E |
| Thu 11/12 | #5 Join + ask (needs #4's `Session` service; seed sessions in tests until it merges) | #4 Create session + join code (needs #3's `requireUser`; merge #3 first) |
| Fri 11/13 | #7 Pin / answered · review #6 · **Sprint 1 review + retro** | #6 Upvote + Pusher live re-rank · review #7 · **retro** |

Total: Ruoyu 2 + 3 + 3 + 2 = 10 pts · Qingyu 3 + 3 + 5 = 11 pts.

## Sprint 2 — Nov 14 → Nov 17 · Goal: moderation, polls, report, public API, docs

| Day | Ruoyu | Qingyu |
| --- | --- | --- |
| Sat 11/14 | **Sprint 2 planning (together)** · #9 Merge duplicates | #8 Moderators hide/unhide (adds `requireStaff`) |
| Sun 11/15 | #11 Session report | #10 Live polls |
| Mon 11/16 | #13 Polish + a11y · README screenshots | #12 Public API + keys + OpenAPI/Swagger |
| Tue 11/17 | Record demo (part 1) · reflection · **Sprint 2 retro** | #14 docs package · record demo (part 2) · reflection · **retro** |

Total: Ruoyu 3 + 3 + 2 = 8 pts · Qingyu 3 + 5 + 3 + 3 = 14 pts. Ruoyu also takes over any slipped Sprint 1 item
and the AGENTS.md maintenance PRs, so the split stays even.

## Dependencies (merge in this order when they touch the same code)

`#1 → #3 → #4 → #5 → #6 → #7` · `#3 → #8 → #9` · `#4 → #10` · `#6, #10 → #11` · `#11 → #12`

## Working agreement

- Every issue: branch → `test(#n)` failing commit → `feat(#n)` → PR → partner reviews within 12 hours with at
  least one real comment → merge (never squash).
- Each of us reviews **every** PR of the other: 6–7 reviews each, above the required 5.
- Standup every day in `docs/standups/sprint-N.md` (each writes their own entry and commits it themselves).
- If a story is not Done by the sprint's last day, it moves to the next sprint in the retro, with the reason.

## Cut list (if we fall behind, cut in this order)

1. #13 presenter large-type toggle (keep a11y checks)
2. #9 merge UI picker → simple "Merge into #id" select
3. #10 confidence polls → MC only (keep both if possible; they share code)
4. Never cut: auth, real time, 3 roles, public API + Swagger, TDD commits, E2E, CI/CD — they carry the most points.

## Planning meeting notes — 2026-11-10

- Attendees: Ruoyu, Qingyu. <!-- fill in: what you discussed, any changes you agreed on -->
- Decisions: single Next.js app on Vercel + Pusher instead of Express + Socket.IO + Railway (see
  `docs/architecture.md`); split by vertical feature slices so both work on frontend and backend.
