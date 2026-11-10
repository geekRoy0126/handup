# HandUp

Live, anonymous Q&A and polls for lectures and talks. The audience joins from their phones with a 6-character
code, asks questions (anonymously if they like) and upvotes the ones they share. The board re-ranks live, the host
pins what they're answering, moderators hide and merge, and a report afterward shows what the room was confused
about.

**Live app:** _https://handup-<team>.vercel.app_ (set after issue #2) · **API docs:** `/api-docs` ·
**Demo video:** _link after #14_

Team: **Ruoyu Wang** and **Qingyu Cheng** — CS6983 Project 2.

[![CI](https://github.com/geekRoy0126/handup/actions/workflows/ci.yml/badge.svg)](https://github.com/geekRoy0126/handup/actions/workflows/ci.yml)
[![Security](https://github.com/geekRoy0126/handup/actions/workflows/security.yml/badge.svg)](https://github.com/geekRoy0126/handup/actions/workflows/security.yml)

## Features

| Role | Can |
| --- | --- |
| **Host** (account) | Create sessions with a join code, pin / mark answered, launch multiple-choice and confidence polls, end the session, read and download the report, create public API keys |
| **Moderator** (account, invited per session) | Hide / unhide questions, merge duplicates, pin / mark answered, read the report |
| **Guest** (no account) | Join with a code, ask (anonymous by default), upvote, answer polls, see live results |
| **Developer** | Read session summaries and poll results through the documented public API |

Real time: every change reaches all open screens within ~2 s through Server-Sent Events; clients refetch, so hidden questions
and anonymous names never travel over the public channel.

## Tech stack

Next.js 16 (App Router, route handlers) · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL 16 (Neon) ·
Prisma 7 · JWT (jose) + bcrypt · Server-Sent Events · zod · Vitest + Testing Library · Playwright ·
GitHub Actions · Vercel.

## Quick start

```bash
npm install
cp .env.example .env            # set JWT_SECRET
docker compose up -d db
npx prisma migrate dev
npm run dev                     # http://localhost:3000
```

Tests: `npm test` (unit) · `npm run test:int` (integration, needs Docker DB) · `npm run test:e2e` (Playwright).
Full guide: [docs/setup-deploy.md](docs/setup-deploy.md).

## Documentation

| Document | |
| --- | --- |
| [docs/PRD.md](docs/PRD.md) | Problem, roles, product rules, user stories with acceptance criteria and estimates |
| [docs/architecture.md](docs/architecture.md) | Architecture, real-time sequence and CI/CD diagrams |
| [docs/database.md](docs/database.md) | ER diagram and schema decisions |
| [public/openapi.json](public/openapi.json) · `/api-docs` | OpenAPI 3.1 spec and Swagger UI |
| [docs/setup-deploy.md](docs/setup-deploy.md) | Local setup, environments, deployment |
| [docs/ui-spec.md](docs/ui-spec.md) | Design tokens, screens, components |
| [docs/sprint-plan.md](docs/sprint-plan.md) | Sprint goals, day-by-day plan, working agreement |
| [docs/standups/](docs/standups) · [docs/retros/](docs/retros) | Standups and retrospectives |
| [docs/contribution-log.md](docs/contribution-log.md) | Who did what |
| [AGENTS.md](AGENTS.md) · [docs/ai-usage.md](docs/ai-usage.md) | AI rules file (Antigravity) and AI usage log |

## How we work

Branch per issue → failing test commit → implementation commit → PR with partner review → CI (lint, typecheck,
unit, integration, build, E2E, security scans) + Vercel preview with its own database → merge → automatic
production deploy. Details in [AGENTS.md §3](AGENTS.md).
