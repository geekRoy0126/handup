# Sprint 2 standups (Nov 12 – Nov 13, 2026)

At least 3 entries per partner. Each partner writes and commits their own entry. Newest first.

```
### YYYY-MM-DD — <name>
- Yesterday: (issues/PRs, e.g. "#3 test commit pushed, PR #16 opened")
- Today:
- Blockers:
- AI note: (what Antigravity did well/badly; any AGENTS.md change needed?)
```

### 2026-11-13 — Ruoyu
- Yesterday: Talked with Qingyu about progress while she reviewed and merged my PRs (#15, #17–#28)
- Today: Reviewed and approved Qingyu's 15 PRs (#41, #47–#51, #53, #55, #57, #64–#69) after merging them
  together locally (lint, typecheck, 109 unit, 110 integration and 36 E2E tests passed); merged them and #29;
  resolved the import conflict in #66; opened #70 / PR #71 for a Semgrep false positive on `main`; reopened #2
- Blockers: Deployment (#2) is still not done; #71 needs Qingyu's review
- AI note: Claude Code read every diff, ran the combined test suite and drafted the review comments

### 2026-11-12 — Ruoyu
_Written retroactively on 2026-11-13._
- Yesterday: Talked with Qingyu about progress and the split of work
- Today: Talked with Qingyu about progress while she reviewed and merged my PRs and opened her fix PRs
- Blockers: Deployment (#2) not started
- AI note: —

### 2026-11-12 — Qingyu
- Yesterday: Got HandUp running locally, read Ruoyu's open Sprint 1 PRs, talked with Ruoyu about progress
- Today:
  - Reviewed and approved #15, #17, #18, #19, #20 with 21 line comments (open redirect in `safeNext`,
    `Math.random` join codes, rate-limit and double-vote races, missing 401/403/409 tests); merged #15–#20
  - Turned my review findings into issues #40, #42–#46 and opened my PRs, each with a failing `test(#n)`
    commit before the fix: #41 (open redirect, double-vote 500), #47 (auth races, login timing),
    #48 (crypto join codes), #49 (rate limit under a burst), #50 (SSE first-connect gap, copy feedback),
    #51 (Semgrep SAST on the private repo, E2E reuses the build)
  - Next: review #21–#29, address Ruoyu's comments on my PRs
- Blockers:
  - Need Ruoyu's review on #41, #47–#51 (authors don't self-merge)
  - #41 and #24 both change `vote-service.ts`: whichever merges second resolves the conflict
  - CodeQL and dependency review stay skipped until the repo is public
- AI note: Used Claude Code (not Antigravity) with AGENTS.md. It reproduced every bug as a failing test
  first: concurrent registration returned [201, 500], a burst of 8 questions all got 201. It needed
  correcting twice: the first #48 race test deleted its own host in `resetDb()` and failed for the wrong
  reason, and Semgrep's first 5 findings were false positives I checked by hand. AGENTS.md §6.1 should
  list Semgrep once #28 lands.
