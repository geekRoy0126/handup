# Sprint 1 retrospective (Nov 10 – Nov 11, 2026)

Held on: 2026-11-13, asynchronously in this file · Attendees: Ruoyu Wang, Qingyu Cheng

## Sprint goal met?
Partly: every Sprint 1 story was coded test-first and merged, but #2 (deployment) is not done, so PRs had no preview deploys.

## Velocity
| Planned points | Done points | Stories done | Stories moved to next sprint (why) |
| --- | --- | --- | --- |
| 21 | 18 | #1, #3, #4, #5, #6, #7 | #2 Deploy (3 pts): needs the Vercel and Neon account setup |

## What went well

## What didn't go well

- **Qingyu:** I had no GitHub activity in Sprint 1 and only started reviewing on Nov 12, so the issues I found
  (an open redirect, three races that answered 500, a bypassable rate limit) were caught a day later than they
  could have been. Next time I'll ask for my own stories at planning and review each PR the day it opens.

## AI-assisted development
<!-- Where Antigravity + AGENTS.md helped, where it went wrong, which rule we added/changed (link the changelog row). -->

## Partner feedback
**Ruoyu → Qingyu:**
- *Helped:* Talking through progress and the split of work on Nov 10–11 settled early that I would implement and
  you would review and test, so I could keep building without waiting.
- *Try next:* See Sprint 2: open each fix PR as soon as the problem is found.

**Qingyu → Ruoyu:**
- *Helped:* The groundwork made it possible for me to review a codebase I hadn't written: the PRD with
  acceptance criteria for every story, AGENTS.md with a changelog that explains *why* each rule exists, and a
  PR template that asks for the failing-test output. When I started reviewing, I could check each PR against
  its ACs instead of guessing what it was meant to do.
- *Try next:* All 14 issues were assigned to you at planning, and the PRs arrived as one stack of 15 before I
  had reviewed any of them. Next time, let's give the second partner at least one or two stories to implement,
  and open PRs one at a time, so reviews start on day one and the reviewer's feedback can shape the next PR.

## Action items for next sprint
- [ ] Give the second partner 1–2 stories at planning and open PRs one at a time (Qingyu)
- [ ] Start deployment first, not last (Qingyu)

---

## Facts to start the discussion (from git, CI and the AI usage log)

- Planned: #1–#7, 21 points. Code for #1 and #3–#7 finished with test-first commits; #2 (Vercel/Neon) waits for
  account login.
- CI problems solved: Windows-built lockfile broke `npm ci` on Linux; gitleaks needed `pull-requests: read`.
- Design changes: Pusher → SSE + `Session.version` (no third-party secret, real time testable in CI).
- Bugs caught by tests before merge: guest calling staff endpoints got 401 instead of 403; test tokens signed at a
  fixed date would have expired in CI.
