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
| Production | **VPS** https://136-65-108-193.sslip.io (Debian 13, systemd + Caddy) | PostgreSQL 17 on the VPS | `scripts/deploy-vps.sh` (see below) |
| Preview (optional, not set up) | Vercel preview URL per PR | Neon branch per preview | every push to a PR branch |

Variables (set in Vercel → Project → Settings → Environment Variables, separately for Preview and Production):

| Variable | Development | Preview | Production |
| --- | --- | --- | --- |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | `.env` (only the first) | set by Neon integration per branch | set by Neon integration |
| `JWT_SECRET` | `.env` | its own value | its own value (never reuse) |

## Production on the VPS (issue #2)

The production app runs on a small GCP VM (2 vCPU, 1 GB RAM) next to another service, so nothing is built there.

| Piece | Where |
| --- | --- |
| App | `/opt/handup/current` → `/opt/handup/releases/<time>-<sha>` (standalone Next.js), `handup.service` ([deploy/vps/handup.service](../deploy/vps/handup.service)): user `handup`, `MemoryMax=320M`, restart on failure |
| HTTPS | Caddy ([deploy/vps/Caddyfile](../deploy/vps/Caddyfile)) with an automatic Let's Encrypt certificate for `136-65-108-193.sslip.io`; SSE is proxied unbuffered |
| Database | PostgreSQL 17 on `127.0.0.1` only, `shared_buffers = 64MB`; role and database `handup` |
| Secrets | `/etc/handup/handup.env` (root:handup 640): `DATABASE_URL`, `JWT_SECRET`, generated on the first deploy, never in git |
| Firewall | GCP: "Allow HTTP traffic" and "Allow HTTPS traffic" on the VM (ports 80 and 443) |

Deploy (from the repo root, with Docker running and SSH access to the VM):

```bash
VPS=ruoyu@136.65.108.193 SSH_KEY=~/.ssh/gcp_discord_bot bash scripts/deploy-vps.sh
```

It builds a Linux standalone bundle in Docker, runs `prisma migrate deploy` through an SSH tunnel, uploads the
bundle as a new release, switches the `current` symlink, restarts and health-checks. **Rollback:**
`sudo ln -sfn /opt/handup/releases/<previous> /opt/handup/current && sudo systemctl restart handup`.
Logs: `journalctl -u handup -f`, `journalctl -u caddy -f`.

## Optional: Vercel + Neon previews

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

PR opened → CI (lint, typecheck, unit, integration, build, E2E) + security (npm audit, gitleaks, Semgrep) →
partner review → merge (merge commit, never squash) → `scripts/deploy-vps.sh` → health check on the VPS.
