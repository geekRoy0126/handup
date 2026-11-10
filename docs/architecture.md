# Architecture

HandUp is one Next.js 16 application: React pages and REST route handlers deploy together to Vercel, data lives
in PostgreSQL (Neon), and Pusher Channels pushes "something changed" events to browsers.

## System context

```mermaid
flowchart LR
  subgraph Clients
    G["Guest phone<br/>(join/[code])"]
    H["Host / moderator laptop<br/>(host/[code], dashboard)"]
    D["Developer app<br/>(course site, Discord bot)"]
  end

  subgraph Vercel["Vercel (preview per PR, production on main)"]
    P["Pages + Server Actions<br/>(React Server Components)"]
    A["Route handlers<br/>/api/v1/**"]
    PUB["Public API<br/>/api/v1/public/** (X-API-Key)"]
    S["Services<br/>auth · session · question · moderation · poll · report · api-key"]
    DOM["Domain (pure)<br/>join-code · rank-questions · merge-votes · poll-results · report"]
  end

  DB[("PostgreSQL<br/>Neon: branch per preview")]
  PU["Pusher Channels<br/>session-&lt;CODE&gt;"]

  G -- HTTPS --> A
  H -- HTTPS --> P
  D -- HTTPS + X-API-Key --> PUB
  P --> S
  A --> S
  PUB --> S
  S --> DOM
  S -- Prisma 7 --> DB
  S -- "notify {at}" --> PU
  PU -- "questions.changed / poll.changed" --> G
  PU -- events --> H
```

## Real-time update (upvote example)

```mermaid
sequenceDiagram
  participant G1 as Guest A
  participant API as POST /api/v1/questions/:id/vote
  participant SVC as question-service
  participant DB as Postgres
  participant PU as Pusher
  participant G2 as Guest B / Host

  G1->>API: vote (hu_guest cookie)
  API->>SVC: toggleVote({ guestId, questionId })
  SVC->>DB: insert/delete Vote (transaction)
  SVC->>PU: trigger session-K7Q2XM "questions.changed" { at }
  API-->>G1: 200 { data: board }
  PU-->>G2: questions.changed
  G2->>API: GET /api/v1/sessions/K7Q2XM/questions
  API-->>G2: board ranked by rankQuestions() (hidden/anonymous filtered for guests)
```

## Layers and rules

| Layer | Folder | May import | Tested by |
| --- | --- | --- | --- |
| Pages, components | `src/app`, `src/components` | services (Server Components/Actions only), validation | Component tests, E2E |
| Route handlers | `src/app/api/v1` | `lib/api/http`, validation, services | Integration tests |
| Services | `src/lib/server/services` | `db`, domain, `realtime` | Integration tests (real Postgres) |
| Domain | `src/lib/domain` | nothing with I/O | Unit tests, ≥ 80% coverage |

Why one app instead of Express + Socket.IO (the proposal's first plan): Vercel cannot keep WebSocket connections
open, and a separate API host would need its own preview environments. One Next.js app gives every PR a complete
preview (UI + API + its own Neon database branch) with no extra setup. Pusher handles fan-out; payloads carry
no data, so access rules stay in our services.

## CI/CD pipeline

```mermaid
flowchart LR
  PR["Pull request"] --> Q["Lint + typecheck"]
  Q --> U["Unit + coverage"]
  Q --> I["Integration<br/>(Postgres service)"]
  U --> B["Build"]
  I --> B
  B --> E["E2E Playwright<br/>(prod build)"]
  PR --> SEC["Security: npm audit · gitleaks · CodeQL · dependency review"]
  PR --> V["Vercel preview deploy<br/>+ Neon branch + migrate"]
  V --> EP["E2E @smoke on preview URL"]
  E --> R{"Partner review<br/>+ all checks green"}
  EP --> R
  SEC --> R
  R -->|merge| M["main"]
  M --> PROD["Vercel production deploy<br/>migrate deploy"]
  PROD --> ES["E2E @smoke on production"]
```
