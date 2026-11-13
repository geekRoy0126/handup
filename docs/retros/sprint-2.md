# Sprint 2 retrospective (Nov 12 – Nov 13, 2026)

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
- *Helped:* Every PR showed its red step, and the business rules lived in small pure functions
  (`rankQuestions`, `mergeVotes`, `computePollResults`), so I could verify the logic quickly and spend my review
  time on edge cases like concurrency. I also appreciated that you left my columns in the contribution log blank
  for me to fill in instead of writing them for me.
- *Try next:* Two things. First, start deployment first, not last: #2 still has no deployment one day before
  the deadline, and it blocks the production URL, the preview deploys and my testing of the live app. Second,
  keep one concern per PR with its own failing test: `fix(#9)` landed inside #10's PR, `fix(#5)` inside the docs
  PR and `fix(#1)` inside the deploy PR, which made those fixes easy to miss in review.

## Action items for next sprint
- [ ]

---

## Facts to start the discussion (from git, CI and the AI usage log)

- Planned: #8–#14, 22 points. Code for all of them finished with test-first commits.
- Bugs caught by tests before merge: a vote cast while a question was being merged could be lost (fixed with row
  locks + a concurrent regression test); a guest page joined twice and created duplicate guests (found by the
  screenshot run).
- Rules file updated to v2.2 with five lessons (see AGENTS.md §8).
