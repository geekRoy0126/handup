Closes #

## What changed
<!-- 2–4 bullets. Link the user story: docs/PRD.md §5 [#n] -->

## How it was tested
<!-- Paste commands and results. For TDD, paste the FAILING output from the test(#n) commit below. -->
- [ ] `npm run lint` · `npm run typecheck`
- [ ] `npm test` (unit) · `npm run test:int` (integration)
- [ ] `npm run test:e2e` (if a UI flow changed)

<details><summary>Failing test output (red step)</summary>

```
paste here
```
</details>

## Screenshots (UI changes)
| Phone (375 px) | Desktop (1280 px) |
| --- | --- |
| | |

## AI usage
<!-- Harness (Antigravity) + model, which AGENTS.md sections it followed, prompts that mattered,
     what you corrected by hand, and whether AGENTS.md changed because of it. -->

## Checklist
- [ ] Every acceptance criterion has a test
- [ ] Failing-test commit comes before the implementation commit
- [ ] `public/openapi.json` updated (if an API changed)
- [ ] No new dependency, or it is named here with the reason
- [ ] AGENTS.md updated if a rule was missing or wrong
