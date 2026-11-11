# Partner contribution log

Updated at the end of each sprint. Numbers come from GitHub (Insights → Contributors, and the PR lists).
Each partner fills in their own column.

| Area | Ruoyu Wang | Qingyu Cheng |
| --- | --- | --- |
| Planning & docs | PRD, AGENTS.md v2.x, sprint plan, architecture/database docs | |
| Infrastructure | #1 scaffold, CI, security workflows, #2 deploy setup | |
| Features | #3–#13 implementation (test-first, PRs #17–#27) | |
| PR reviews | | |
| Testing the deployed app | | |
| Demo video | | |
| Retros / standups | | |

## Per sprint

| Sprint | Ruoyu: commits / PRs merged / reviews | Qingyu: commits / PRs merged / reviews |
| --- | --- | --- |
| Sprint 1 | see PRs #15–#21 | |
| Sprint 2 | see PRs #22–#28 · 31 commits total on the stack | |

Commands to fill this in:
```bash
git shortlog -sn --no-merges
gh pr list --state merged --author <login> --limit 100 --json number --jq length
gh search prs --repo <owner>/handup --reviewed-by <login> --json number --jq length
```
