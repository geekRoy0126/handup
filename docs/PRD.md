# HandUp — Product Requirements (P2)

Team: Ruoyu Wang, Qingyu Cheng · CS6983 Project 2 · Version 1.0 (2026-11-10)

## 1. Problem

In lectures and club talks most people never ask their question out loud. Questions typed into Zoom chat or
Discord scroll away, and the speaker cannot tell which ones half the room shares. "Raise your hand if this makes
sense" tells the speaker almost nothing, and nothing is recorded once the talk ends.

## 2. Users

- **Host**: an instructor, TA or club speaker running a talk for about 20–200 people. Has an account.
- **Moderator**: a TA or co-organizer the host invites to keep the board clean. Has an account.
- **Guest (audience)**: joins from a phone with a code. No account, anonymous if they choose.
- **Developer**: reads session summaries and poll results through the public API (course site, Discord bot).

Out of scope: video/audio, attendance or grading, LMS integration. Stretch only (after every US below is Done):
word-cloud polls, full-screen presenter view, AI grouping of similar questions.

## 3. Roles and permissions

| Action | Host (owner) | Moderator | Guest |
| --- | --- | --- | --- |
| Create / end session, invite moderators | ✅ | — | — |
| Ask, upvote, answer polls | — | — | ✅ |
| Pin a question, mark answered | ✅ | ✅ | — |
| Hide / unhide, merge duplicates | ✅ | ✅ | — |
| Launch / close polls | ✅ | — | — |
| View report | ✅ | ✅ | — |
| Create API keys | ✅ (for own sessions) | — | — |

Wrong role → 403. No valid token → 401. Hosts and moderators are both `User`s; "host" and "moderator" are
per-session relationships (`Session.hostId`, `SessionModerator`).

**Tokens.** Users: JWT (`jose`, HS256) `{ sub: userId, kind: "user" }`, 7 days, httpOnly cookie `hu_session`;
`/api/v1/*` also accepts `Authorization: Bearer <jwt>`. Guests: JWT `{ sub: guestId, sid: sessionId,
kind: "guest" }`, 24 hours, httpOnly cookie `hu_guest`. A guest token is valid only for its own session.

## 4. Product rules (the only source for this logic)

### 4.1 Join codes
- 6 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O, 1/I/L), generated randomly, unique.
- Input is normalized before lookup: trim, remove spaces and dashes, uppercase. `k7q 2xm` → `K7Q2XM`.
- Shown to the host as `K7Q-2XM` (dash after 3 characters) and as a join link `/join/K7Q2XM`.
- An `ENDED` session cannot be joined ("This session has ended.").

### 4.2 Questions and votes
- Body is trimmed, 3–300 characters. Optional display name 1–40 characters; empty means "Anonymous".
- If `isAnonymous` is true the author's name is never sent to any client, the host included.
- Rate limit: at most 5 questions per guest in any 60 seconds → 429 `RATE_LIMITED` "Slow down — try again in a
  minute." (count rows in the last 60 s; no in-memory limiter, so it works on serverless).
- One vote per guest per question; voting again removes the vote (toggle). A guest cannot vote on their own
  question (403). Votes on `MERGED` or hidden questions are rejected (409).

### 4.3 Board order and moderation
- Audience board = `OPEN`, not hidden questions, ordered by: **pinned first**, then **votes descending**, then
  **older first** (`createdAt` ascending). An "Answered" section below lists `ANSWERED` ones, newest answer first.
- At most one pinned question per session: pinning another one unpins the previous. Marking a question answered
  also unpins it.
- Hidden questions disappear for guests (the author included) and stay visible, greyed out with a "Hidden" tag,
  for host and moderators. Unhide restores them.
- **Merge** source → target: same session, different questions, neither `MERGED`. Each vote on the source moves
  to the target unless that guest already voted for the target (then it is dropped — never double-count).
  Source becomes `MERGED` with `mergedIntoId = target`, unpinned. Merges are final (no undo in v1).

### 4.4 Polls
- At most one `OPEN` poll per session; launching another while one is open → 409.
- `MULTIPLE_CHOICE`: prompt 3–200 characters, 2–6 options, each 1–80 characters, kept in the order entered.
- `CONFIDENCE`: prompt given by the host; options fixed: `1 – Lost`, `2`, `3 – Getting there`, `4`,
  `5 – Got it`.
- One response per guest; changing it while open replaces the old one. Closed polls reject responses (409).
- Results: count per option and percent of responses, rounded to whole numbers (largest-remainder so the
  percentages add up to exactly 100; 0 responses → all 0%). Guests see results after they answer.

### 4.5 Session report
- Host and moderators can open it any time; it is final once the session is `ENDED`.
- Contents: totals (guests, questions, votes), top 10 questions by votes (any status except `MERGED`, hidden
  excluded), unanswered questions (`OPEN`, not hidden), and every poll with its results.
- "Download as Markdown" button. Anonymous rules (§4.2) still apply.

### 4.6 Public API
- Hosts create named API keys: `hu_` + 32 random base62 characters. Only the SHA-256 hash and the first 8
  characters (`prefix`) are stored; the full key is shown once. Keys can be revoked.
- Clients send `X-API-Key: hu_…`. A key can read only sessions owned by its creator; others → 404 (not 403, so
  codes cannot be probed).
- Endpoints: `GET /api/v1/public/sessions/{code}/summary` and `GET /api/v1/public/sessions/{code}/polls`.
  Same visibility rules as the report. Documented in `public/openapi.json` (OpenAPI 3.1), shown at `/api-docs`.

### 4.7 Real time
- Pusher Channels, public channel `session-<CODE>`. Events: `questions.changed`, `poll.changed`,
  `session.ended`. Payload is only `{ "at": "<ISO time>" }`; clients **refetch** through the API.
- Why refetch instead of sending data: hidden questions and anonymous authors can never leak through the public
  channel, and repeated or out-of-order events are harmless.
- Services publish only after the database write commits.

## 5. User stories

Estimates: points (1 = under 2 h, 2 = half a day, 3 = a day, 5 = two days). `[#n]` = GitHub issue number.
Owner = who implements it; the other partner reviews the PR.

### Sprint 1 — "One full question loop works live" (2026-11-11 → 2026-11-13)

**[#1] Scaffold, rules file and PRD** · chore · 2 pts · Ruoyu
- [ ] Next 16 + Prisma 7 + Tailwind 4 + Vitest + Playwright project runs (`npm run dev`, `npm test`)
- [ ] `AGENTS.md`, `docs/PRD.md`, `docs/ui-spec.md` committed; full Prisma schema with the first migration
- [ ] CI workflow (lint, typecheck, unit, integration, build, E2E) and security workflow committed

**[#2] Deploy: Vercel + Neon + environments + preview E2E** · chore · 3 pts · Qingyu
- [ ] Vercel project linked to the repo: every PR gets a preview URL, `main` deploys to production
- [ ] Neon Vercel integration: each preview gets its own database branch; `vercel-build` runs migrations
- [ ] Environment variables set separately for Development / Preview / Production; documented in
      `docs/setup-deploy.md`
- [ ] Playwright smoke tests run against the preview URL on every PR (`e2e-preview.yml`) and pass

**[#3] US1 — Host account** · feature · 3 pts · Ruoyu
As a host, I want an account so that my sessions and reports belong to me.
- [ ] Register with name, email, password (≥ 8 chars); duplicate email → "An account with this email already
      exists."
- [ ] Log in sets the `hu_session` cookie; wrong email or password → "Email or password is incorrect."
- [ ] Log out clears the cookie; `/dashboard` redirects logged-out users to `/login`
- [ ] Passwords hashed with bcryptjs cost 12; `passwordHash` never leaves the service layer
- [ ] `POST /api/v1/auth/register`, `POST /api/v1/auth/login` return a JWT for API clients

**[#4] US2 — Create a session with a join code** · feature · 3 pts · Qingyu
As a host, I want to create a session with a short join code so my audience can get in within seconds.
- [ ] Dashboard form: title (3–80 chars) → session created `LIVE` with a code following §4.1
- [ ] Host page shows the code as `K7Q-2XM`, a copyable join link, and the session list on `/dashboard`
- [ ] Host can end a session (confirm dialog); status becomes `ENDED`, `endedAt` set
- [ ] Only the host can open `/host/[code]` and end the session (403 otherwise)

**[#5] US3 — Join and ask a question** · feature · 3 pts · Ruoyu
As an audience member, I want to join with the code and ask a question, anonymously if I choose, without
creating an account, so asking feels low-risk.
- [ ] Home page code field accepts `k7q 2xm` / `K7Q-2XM` (§4.1); unknown code → "No session with that code.";
      ended → "This session has ended."
- [ ] Joining creates a `Guest` and sets `hu_guest`; reopening the link keeps the same guest
- [ ] Ask form: body 3–300 chars with live counter, optional name, "Ask anonymously" toggle (on by default)
- [ ] Anonymous questions never expose the name (§4.2); 6th question within 60 s → "Slow down — try again in a
      minute."
- [ ] New question appears on the board immediately for the asker

**[#6] US4 — Upvote with live re-ranking** · feature · 5 pts · Qingyu
As an audience member, I want to upvote questions and watch the list re-rank live, so the questions most people
care about rise to the top.
- [ ] Upvote toggles (§4.2); own question's button is disabled with "Your question"
- [ ] Board order follows §4.3 exactly (unit-tested domain function `rankQuestions`)
- [ ] Pusher events (§4.7): a second browser sees new questions and vote changes within 2 s without reloading
- [ ] Vote count has `aria-live="polite"`; E2E test with two browser contexts proves the live update

**[#7] US5 — Host pins and marks answered** · feature · 2 pts · Ruoyu
As a host, I want to mark questions answered or pin one, so everyone sees what I'm addressing right now.
- [ ] Pin / unpin; only one pinned at a time (§4.3); pinned card is highlighted with a "Now answering" tag
- [ ] Mark answered moves it to the "Answered" section and unpins it; can be reopened
- [ ] Guests see the change live; guests calling these endpoints get 403

### Sprint 2 — "Moderation, polls, report, public API" (2026-11-14 → 2026-11-17)

**[#8] US6 — Moderators hide and unhide** · feature · 3 pts · Qingyu
As a moderator, I want to hide inappropriate questions so the board stays useful without the host managing it.
- [ ] Host invites a moderator by the email of an existing account; unknown email → "No HandUp account with this
      email."; list and remove moderators
- [ ] Moderators see the session in their dashboard and can open the moderator view
- [ ] Hide / unhide follows §4.3; hidden questions vanish live for guests
- [ ] Moderators cannot launch polls, end the session or invite others (403)

**[#9] US7 — Merge duplicate questions** · feature · 3 pts · Ruoyu
As a moderator, I want to merge duplicates so votes are not split across the same question.
- [ ] "Merge into…" picker on each question lists the other open questions of the session
- [ ] Votes move per §4.3 with no double counting (domain function `mergeVotes` + integration test)
- [ ] Merged question disappears from the board; target shows "+1 merged"

**[#10] US8 — Live polls** · feature · 5 pts · Qingyu
As a host, I want to launch a multiple-choice or confidence poll and see results live, so I know whether to move
on or explain again.
- [ ] Host launches MC (2–6 options) or confidence poll (§4.4); second open poll → "Close the current poll
      first."
- [ ] Guests get the poll live as a card above the board; one response, changeable while open
- [ ] Results bar chart with counts and percentages (largest-remainder rounding, unit-tested)
- [ ] Host closes the poll; closed polls reject responses and show final results

**[#11] US9 — Session report** · feature · 3 pts · Ruoyu
As a host, I want a report afterward with top and unanswered questions and poll results, so I can follow up.
- [ ] `/host/[code]/report` shows the contents of §4.5; moderators can open it, guests get 403
- [ ] "Download as Markdown" produces the same content (domain function `renderReportMarkdown`, unit-tested)
- [ ] Empty states: no questions, no polls

**[#12] US10 — Public API with documentation** · feature · 3 pts · Qingyu
As a developer, I want a documented API for session summaries and poll results, so a course site or Discord bot
can show them.
- [ ] Host creates, lists and revokes API keys at `/settings/api-keys`; key shown once (§4.6)
- [ ] Both public endpoints work with `X-API-Key`; missing/revoked key → 401, someone else's session → 404
- [ ] `public/openapi.json` (OpenAPI 3.1) documents every `/api/v1` endpoint; Swagger UI at `/api-docs`
- [ ] Integration test checks that responses match the documented schema shape

**[#13] Polish: accessibility, mobile and presenter-friendly host view** · chore · 2 pts · Ruoyu
- [ ] `@axe-core/playwright` check on home, join, board, host and report pages has no serious violations
- [ ] Every page has loading, empty and error states; checked at 375 px and 1280 px
- [ ] Host view readable on a projector (large type toggle)

**[#14] Documentation package and demo** · docs · 3 pts · Qingyu (both contribute)
- [ ] README: overview, features, live URL, screenshots, tech stack, test commands, links to every doc
- [ ] Architecture and database diagrams up to date; API docs linked; setup/deploy guide verified on a clean
      clone
- [ ] Sprint retros, standups and contribution log complete; 10-minute demo video recorded and linked
