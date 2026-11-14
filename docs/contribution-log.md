# Partner contribution log

Updated at the end of each sprint. Numbers come from GitHub (Insights → Contributors, and the PR lists).
Each partner fills in their own column.

| Area | Ruoyu Wang | Qingyu Cheng |
| --- | --- | --- |
| Planning & docs | PRD, AGENTS.md v2.x, sprint plan, architecture/database docs | Proposal and split of work with Ruoyu (Nov 10); my standups (#52, PR #53); my parts of the contribution log, sprint plan and AI log (#54) |
| Infrastructure | #1 scaffold, CI, security workflows, #2 deploy setup | #46 Semgrep SAST that runs on the private repo, E2E reuses the build job's output (PR #51) |
| Features | #3–#13 implementation (test-first, PRs #17–#27) | Fixes for bugs I found in review, each test-first: #40 open redirect and double-vote 500 (PR #41), #42 auth races (PR #47), #43 crypto join codes (PR #48), #44 rate limit under a burst (PR #49), #45 SSE first-connect gap and copy feedback (PR #50); resolved the #41/#24 conflict in `vote-service.ts` |
| PR reviews | | 14 reviews (#15, #17–#29) with 46 line comments; merged #15 and #17–#28 after review |
| Testing the deployed app | | Not yet: the app is not deployed (#2) |
| Demo video | | My sections in `docs/demo-script.md` (not recorded yet) |
| Retros / standups | | Standups Nov 10–12 (Nov 10–11 written on Nov 12 with the instructor's permission); partner feedback in both retros |

## Per sprint

| Sprint | Ruoyu: commits / PRs merged / reviews | Qingyu: commits / PRs merged / reviews |
| --- | --- | --- |
| Sprint 1 | see PRs #15–#21 | 0 / 0 / 0. No GitHub activity besides accepting the invitation; worked on the proposal, split of work and local setup |
| Sprint 2 | see PRs #22–#28 · 31 commits total on the stack | 15 commits (before #54) in 7 PRs (#41, #47–#51, #53), all still open on Nov 12 · 14 reviews · merged 13 of Ruoyu's PRs |

Qingyu's numbers as of 2026-11-12, from these commands:
```bash
git shortlog -sn --no-merges
gh pr list --state merged --author <login> --limit 100 --json number --jq length
gh search prs --repo <owner>/handup --reviewed-by <login> --json number --jq length
```
