# Sprint 2 retrospective (Nov 12 – Nov 13, 2026)

Held on: 2026-11-13, asynchronously in this file · Attendees: Ruoyu Wang, Qingyu Cheng

## Sprint goal met?
Partly: all Sprint 2 stories and Qingyu's 15 review-fix PRs are merged, but the app is still not deployed (#2) and the demo video is not recorded.

## Velocity
| Planned points | Done points | Stories done | Stories moved to next sprint (why) |
| --- | --- | --- | --- |
| 22 + review fixes (#40, #42–#46, #52, #54, #56, #58–#63) | 22 + all review fixes | #8–#14 and every review-fix issue | #2 Deploy (carried from Sprint 1); #70 Semgrep false positive (PR #71 in review) |

## What went well

## What didn't go well

## AI-assisted development
<!-- Where Antigravity + AGENTS.md helped, where it went wrong, which rule we added/changed (link the changelog row). -->

## Partner feedback
**Ruoyu → Qingyu:**
- *Helped:* Your reviews found real bugs that our tests had missed (an open redirect, races that answered 500, a
  bypassable rate limit, a deadlock between pins and votes), and you fixed each one test-first in its own PR.
- *Try next:* Open each fix PR as soon as you find the problem, instead of a batch on the last day, so merges
  and conflicts (like the one in #66) don't pile up before the deadline.

**Qingyu → Ruoyu:**
- *Helped:* Every PR showed its red step, and the business rules lived in small pure functions
  (`rankQuestions`, `mergeVotes`, `computePollResults`), so I could verify the logic quickly and spend my review
  time on edge cases like concurrency. I also appreciated that you left my columns in the contribution log blank
  for me to fill in instead of writing them for me.
- *Try next:* Two things. First, start deployment first, not last: #2 still has no deployment one day before
  the deadline, and it blocks the production URL, the preview deploys and my testing of the live app. Second,
  keep one concern per PR with its own failing test: `fix(#9)` landed inside #10's PR, `fix(#5)` inside the docs
  PR and `fix(#1)` inside the deploy PR, which made those fixes easy to miss in review.

## Action items for next sprint
- [ ] Deploy first, before features (Qingyu)
- [ ] One concern per PR, each with its own failing test; no fixes hidden inside unrelated PRs (Qingyu)
- [ ] Open fix PRs as soon as a problem is found (Ruoyu)
- [ ] Pin the Semgrep rule set so CI results don't change on their own (#70)

---

## Facts to start the discussion (from git, CI and the AI usage log)

- Planned: #8–#14, 22 points. Code for all of them finished with test-first commits.
- Bugs caught by tests before merge: a vote cast while a question was being merged could be lost (fixed with row
  locks + a concurrent regression test); a guest page joined twice and created duplicate guests (found by the
  screenshot run).
- Rules file updated to v2.2 with five lessons (see AGENTS.md §8).
