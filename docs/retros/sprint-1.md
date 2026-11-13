# Sprint 1 retrospective (Nov 10 – Nov 11, 2026)

Held on: YYYY-MM-DD · Attendees: Ruoyu Wang, Qingyu Cheng

## Sprint goal met?
<!-- yes / partly / no, one sentence -->

## Velocity
| Planned points | Done points | Stories done | Stories moved to next sprint (why) |
| --- | --- | --- | --- |
| | | | |

## What went well

## What didn't go well

- **Qingyu:** I had no GitHub activity in Sprint 1 and only started reviewing on Nov 12, so the issues I found
  (an open redirect, three races that answered 500, a bypassable rate limit) were caught a day later than they
  could have been. Next time I'll ask for my own stories at planning and review each PR the day it opens.

## AI-assisted development
<!-- Where Antigravity + AGENTS.md helped, where it went wrong, which rule we added/changed (link the changelog row). -->

## Partner feedback
**Ruoyu → Qingyu:** <!-- one thing that helped, one thing to try next sprint -->

**Qingyu → Ruoyu:**
- *Helped:* The groundwork made it possible for me to review a codebase I hadn't written: the PRD with
  acceptance criteria for every story, AGENTS.md with a changelog that explains *why* each rule exists, and a
  PR template that asks for the failing-test output. When I started reviewing, I could check each PR against
  its ACs instead of guessing what it was meant to do.
- *Try next:* All 14 issues were assigned to you at planning, and the PRs arrived as one stack of 15 before I
  had reviewed any of them. Next time, let's give the second partner at least one or two stories to implement,
  and open PRs one at a time, so reviews start on day one and the reviewer's feedback can shape the next PR.

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
