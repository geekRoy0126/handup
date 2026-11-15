# Sprint 2 retrospective (Nov 12 – Nov 13, 2026)

Held on: 2026-11-13, asynchronously in this file · Attendees: Ruoyu Wang, Qingyu Cheng

## Sprint goal met?
Partly: all Sprint 2 stories and Qingyu's 15 PRs are merged; the app was only deployed on the sprint's last day (Nov 13; #2 closed), the automated deploy workflow (PR #74) was merged on Nov 15, and the demo video is not recorded yet.

## Velocity
| Planned points | Done points | Stories done | Stories moved to next sprint (why) |
| --- | --- | --- | --- |
| 22 + review fixes (#40, #42–#46, #52, #54, #56, #58–#63) | 22 + all review fixes | #8–#14 and every review-fix issue | #2 Deploy (carried from Sprint 1); #70 Semgrep false positive (PR #71 in review) |

## What went well

- Partner reviews found real bugs (an open redirect, several races, a deadlock between pins and votes), and each was
  fixed test-first in its own PR.
- Before merging, all 17 open PRs were merged together locally and every test was run (109 unit, 110 integration,
  36 E2E): only one trivial import conflict, and `main` never broke.
- The app is deployed to our own VPS: every PR deploys to a preview slot and every merge to production from GitHub
  Actions, with smoke tests against the deployed URL.

## What didn't go well

- **Deployment came last.** #2 carried over from Sprint 1 and was only done on the sprint's last day (Nov 13); the
  deploy workflow (PR #74) was merged on Nov 15, so most PRs never had a preview deploy (both).
- **Merges piled up at the end.** 14 stacked feature PRs (#15, #17–#29), then Qingyu's 15 PRs (12 fixes, 3 docs),
  were merged in big batches, which caused conflicts (PR #41 with PR #24 in `vote-service.ts`, and PR #66)
  (both; Ruoyu's feedback to Qingyu).
- **Fixes rode inside unrelated PRs without a failing-test commit first:** `fix(#9)` in PR #24 (its regression test
  came in the same commit), `fix(#5)` in PR #28 and `fix(#1)` in PR #29 (Qingyu's feedback to Ruoyu).
- **CI changed on its own:** Semgrep's registry rules updated and turned `main` red (#70, PR #71), because the rule
  set isn't pinned.
- **Docs drifted from the code** in places ("rejected on review", "checked at startup", "still not deployed");
  review caught each one.

## AI-assisted development

- Reviews and fixes were AI-assisted (Claude Code with `AGENTS.md`). Ruoyu had it read every diff and run the
  combined suite of all open PRs before merging them; Qingyu used it to draft review comments and the tests for
  each fix.
- **The AI needed checking every time:** drafted comments pointed at the wrong line; tests failed for the wrong
  reason (PR #48, PR #69) or were too strict (PR #67); Semgrep's first findings were false positives (PR #51); one
  E2E run on Nov 15 (after the sprint) used a stale branch.
- **Biggest catch:** the AI's first fix for the pin race (PR #65) locked the Session row first and deadlocked with
  votes; a concurrent test showed `[200, 200, 500]` before it was fixed with an advisory lock.
- **Rules changed:** v2.3 (Qingyu, PR #57): check-then-write races, lock order, concurrent red-first tests,
  agent-drafted review comments, security rules; v2.4 (Ruoyu, PR #74): VPS deployment.

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
