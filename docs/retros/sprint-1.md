# Sprint 1 retrospective (Nov 11 – Nov 13, 2026)

Held on: YYYY-MM-DD · Attendees: Ruoyu Wang, Qingyu Cheng

## Sprint goal met?
<!-- yes / partly / no, one sentence -->

## Velocity
| Planned points | Done points | Stories done | Stories moved to next sprint (why) |
| --- | --- | --- | --- |
| | | | |

## What went well

## What didn't go well

## AI-assisted development
<!-- Where Antigravity + AGENTS.md helped, where it went wrong, which rule we added/changed (link the changelog row). -->

## Partner feedback
**Ruoyu → Qingyu:** <!-- one thing that helped, one thing to try next sprint -->

**Qingyu → Ruoyu:**

## Action items for next sprint
- [ ]

---

## Facts to start the discussion (from git, CI and the AI usage log)

- Planned: #1–#7, 21 points. Code for #1 and #3–#7 finished with test-first commits; #2 (Vercel/Neon) waits for
  account login.
- CI problems solved: Windows-built lockfile broke `npm ci` on Linux; gitleaks needed `pull-requests: read`.
- Design changes: Pusher → SSE + `Session.version` (no third-party secret, real time testable in CI).
- Bugs caught by tests before merge: guest calling staff endpoints got 401 instead of 403; test tokens signed at a
  fixed date would have expired in CI.
