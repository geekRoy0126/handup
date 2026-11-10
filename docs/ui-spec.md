# HandUp — UI spec

## 1. Tokens (`src/app/globals.css`)

Calm and focused: one indigo brand color, cool greys, generous white space, rounded cards (`rounded-xl`).

| Token | Use | Verified small-text pairs (≥ 4.5 : 1) |
| --- | --- | --- |
| `brand-600` | Primary buttons, focus ring, links | `text-white` on `bg-brand-600`; `text-brand-600` on `bg-surface` |
| `status-pinned` | "Now answering" tag and pinned card border | `text-status-pinned` on `bg-surface` / `bg-surface-muted` |
| `status-answered` | "Answered" tag | `text-status-answered` on `bg-surface` / `bg-surface-muted` |
| `status-hidden` | "Hidden" tag (staff only) | `text-status-hidden` on `bg-surface` |
| `danger` | Destructive actions, errors | `text-danger` on `bg-surface`; `text-white` on `bg-danger` |
| `ink`, `ink-muted` | Body text, secondary text | on `bg-surface` / `bg-surface-muted` |

Never lower text contrast with `opacity-*`. Status is always color **plus** a word or icon.

## 2. Screens

| Route | Who | Layout |
| --- | --- | --- |
| `/` | Everyone | Product line, big join-code field (`inputmode="text"`, `autocapitalize="characters"`), "Host a session" link |
| `/login`, `/register` | Hosts, moderators | Single centered card |
| `/dashboard` | Signed in | "New session" form + list: sessions I host, sessions I moderate (status tag, date) |
| `/join/[code]` | Guests | Phone first. Header with session title. Active poll card (if any) → ask form → board → "Answered" section |
| `/host/[code]` | Host, moderators | ≥ 1024 px: left = board with staff actions; right = join code (large), poll panel, moderators. Below 1024 px: tabs |
| `/host/[code]/report` | Host, moderators | Totals row, top 10, unanswered, polls; "Download as Markdown" |
| `/settings/api-keys` | Hosts | Key list (name, prefix, created, last used, Revoke); create dialog shows the key once with Copy |
| `/api-docs` | Developers | Swagger UI for `public/openapi.json` |

## 3. Components (`src/components`)

| Component | Behavior |
| --- | --- |
| `QuestionCard` | Body, author ("Anonymous" when anonymous), relative time, vote button with count (`aria-pressed`, `aria-live="polite"` on the count). Variants: pinned (border + "Now answering"), answered, hidden (staff only, greyed + "Hidden") |
| `VoteButton` | Toggle; disabled with label "Your question" on own question; ≥ 44 × 44 px |
| `AskForm` | Textarea with live `n/300` counter, display-name field, "Ask anonymously" switch (default on), inline errors |
| `StaffActions` | Pin / Unpin · Mark answered / Reopen · Hide / Unhide · Merge into… (opens `MergeDialog`) |
| `PollCard` | Guest: prompt + option buttons, then results. Host: results bars + Close poll |
| `PollResults` | Horizontal bars, label, count and percent; `aria-live="polite"` |
| `JoinCode` | Shows `K7Q-2XM` in large mono type + Copy link button (+ QR code if time allows) |
| `EmptyState`, `Skeleton`, `ErrorState` | Used by every list and page; ErrorState has a Retry button |

## 4. Flows

1. **Host:** register → dashboard → New session → host console shows code → share → questions arrive live →
   pin / answer → launch poll → close poll → End session → report.
2. **Guest:** open link or type code → board → ask (anonymous by default) → upvote others → poll card appears →
   answer → see results.
3. **Moderator:** host invites by email → moderator's dashboard lists the session → console with staff actions
   (no poll, end or invite controls).

Re-ordering cards animates with a short transform unless `prefers-reduced-motion` is set.
