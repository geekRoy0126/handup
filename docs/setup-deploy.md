# Setup and deployment guide

## Local development

Requirements: Node.js 22+, Docker Desktop, Git.

```bash
git clone https://github.com/<owner>/handup.git && cd handup
npm install                       # also runs `prisma generate`
cp .env.example .env              # then set JWT_SECRET (openssl rand -base64 32)
docker compose up -d db           # Postgres 16 on localhost:5432
npx prisma migrate dev            # create tables
npm run dev                       # http://localhost:3000
```

| Command | What |
| --- | --- |
| `npm test` / `npm run test:watch` | Unit tests (Vitest, jsdom) |
| `npm run test:int` | Integration tests (needs the Docker database) |
| `npm run test:coverage` | Unit tests + coverage gate on `src/lib/domain` |
| `npm run test:e2e` | Playwright (starts `next dev` automatically); first time: `npx playwright install chromium` |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |
| `npm run db:studio` | Browse the database |

## Environments

| Environment | Where | Database | Deployed when |
| --- | --- | --- | --- |
| Development | your laptop | Docker Postgres | `npm run dev` |
| CI | GitHub Actions | Postgres service container (throwaway) | every PR and push to `main` |
| Preview | Vercel preview URL per PR | Neon branch per preview (created by the Neon integration) | every push to a PR branch |
| Production | Vercel production URL | Neon `main` branch | every merge to `main` |

Variables (set in Vercel → Project → Settings → Environment Variables, separately for Preview and Production):

| Variable | Development | Preview | Production |
| --- | --- | --- | --- |
| `DATABASE_URL` | `.env` | set by Neon integration per branch | set by Neon integration |
| `JWT_SECRET` | `.env` | its own value | its own value (never reuse) |

## One-time cloud setup (issue #2)

1. **GitHub:** push the repo, add the partner as a collaborator, run `node scripts/setup-github.mjs --partner <login>`.
2. **Neon** (free): create project `handup`. Don't create tables by hand; migrations do it.
3. **Vercel** (free Hobby): New Project → import the GitHub repo → framework Next.js.
   - Build command: `npm run vercel-build` (runs `prisma migrate deploy` then `next build`).
   - Integrations → **Neon** → connect project `handup`, enable "Create a branch for each Preview deployment".
   - Add the environment variables above.
4. **Preview E2E:** Vercel → Settings → Deployment Protection → Protection Bypass for Automation → copy the secret
   into GitHub → Settings → Secrets → Actions as `VERCEL_AUTOMATION_BYPASS_SECRET`.
5. After the first green CI run on `main`: `node scripts/setup-github.mjs --protect` (requires partner review +
   all CI checks before merge; on a private repo this needs GitHub Pro, which is free with GitHub Education).

## Release flow

PR opened → CI + security + Vercel preview (+ Neon branch) → E2E on the preview URL → partner review → merge
(merge commit or rebase, never squash) → Vercel production deploy runs `prisma migrate deploy` → E2E smoke on
production. Rollback: Vercel → Deployments → previous deployment → "Promote to Production".
