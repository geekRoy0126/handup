# Architecture

HandUp is one Next.js 16 application: React pages and REST route handlers deploy together to Vercel, data lives
in PostgreSQL (Neon), and a Server-Sent Events stream tells browsers "something changed" so they refetch.

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

  G -- HTTPS --> A
  H -- HTTPS --> P
  D -- HTTPS + X-API-Key --> PUB
  P --> S
  A --> S
  PUB --> S
  S --> DOM
  S -- Prisma 7 --> DB
  SSE["SSE route<br/>/api/v1/sessions/:code/events"]
  S -- "bump Session.version (same transaction)" --> DB
  SSE -- "poll version every 1 s" --> DB
  SSE -- "event: changed" --> G
  SSE -- "event: changed" --> H
```

## Real-time update (upvote example)

```mermaid
sequenceDiagram
  participant G1 as Guest A
  participant API as POST /api/v1/questions/:id/vote
  participant SVC as question-service
  participant DB as Postgres
  participant SSE as GET /events (SSE)
  participant G2 as Guest B / Host

  G1->>API: vote (hu_guest cookie)
  API->>SVC: toggleVote({ guestId, questionId })
  SVC->>DB: insert/delete Vote + version++ (one transaction)
  API-->>G1: 200 { data: { voted, votes } }
  SSE->>DB: SELECT version (every 1 s)
  SSE-->>G2: event: changed { version }
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
preview (UI + API + its own Neon database branch) with no extra setup. Real time uses SSE with a version counter
in Postgres: it works across serverless instances, needs no third-party account, and events carry no data, so
access rules stay in our services.

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
