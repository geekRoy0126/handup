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
| Preview | https://preview.136-65-108-193.sslip.io (VPS, port 3001) | `handup_preview` on the VPS, **reset on every deploy** | every push to a PR branch (`deploy.yml`); one slot: the most recently pushed PR |
| Production | https://136-65-108-193.sslip.io (VPS, port 3000) | `handup` on the VPS | every merge to `main` (`deploy.yml`) |

Each environment has its own secrets; nothing is shared between preview and production:

| Variable | Development | Preview | Production |
| --- | --- | --- | --- |
| `DATABASE_URL` | `.env` | `/etc/handup/preview.env` | `/etc/handup/handup.env` |
| `JWT_SECRET` | `.env` | its own random value | its own random value (never reused) |

GitHub Actions secrets used by `deploy.yml`: `VPS_HOST`, `VPS_SSH_KEY` (the dedicated `deploy` user's key, not a
personal key), `VPS_KNOWN_HOSTS` (pinned host keys), `PROD_DATABASE_URL` and `PREVIEW_DATABASE_URL` (via the SSH
tunnel on port 15432, used only for `prisma migrate deploy`).

## Production on the VPS (issue #2)

The production app runs on a small GCP VM (2 vCPU, 1 GB RAM) next to another service, so nothing is built there.

| Piece | Where |
| --- | --- |
| App | `/opt/handup/current` → `/opt/handup/releases/<time>-<sha>` (standalone Next.js), `handup.service` ([deploy/vps/handup.service](../deploy/vps/handup.service)): user `handup`, `MemoryMax=320M`, restart on failure |
| HTTPS | Caddy ([deploy/vps/Caddyfile](../deploy/vps/Caddyfile)) with an automatic Let's Encrypt certificate for `136-65-108-193.sslip.io`; SSE is proxied unbuffered |
| Database | PostgreSQL 17 on `127.0.0.1` only, `shared_buffers = 64MB`; role and database `handup` |
| Secrets | `/etc/handup/handup.env` (root:handup 640): `DATABASE_URL`, `JWT_SECRET`, generated on the first deploy, never in git |
| Preview slot | `/opt/handup-preview`, `handup-preview.service` (port 3001, `MemoryMax=256M`), database `handup_preview`, `/etc/handup/preview.env` |
| Deploy access | user `deploy` (key login only) may run exactly one sudo command: `/usr/local/bin/handup-release` ([deploy/vps/handup-release](../deploy/vps/handup-release), [sudoers](../deploy/vps/sudoers-deploy)), which validates its arguments |
| Firewall | GCP: "Allow HTTP traffic" and "Allow HTTPS traffic" on the VM (ports 80 and 443) |

**Automatic:** [`deploy.yml`](../.github/workflows/deploy.yml) deploys every PR to the preview slot and every merge to
production, then runs the Playwright `@smoke` tests against the deployed URL, records a GitHub deployment and comments
the preview link on the PR.

**Manual / first-time setup** (from the repo root, with Docker running and SSH access to the VM):

```bash
VPS=ruoyu@136.65.108.193 SSH_KEY=~/.ssh/gcp_discord_bot bash scripts/deploy-vps.sh
```

It builds a Linux standalone bundle in Docker, runs `prisma migrate deploy` through an SSH tunnel, uploads the
bundle as a new release, switches the `current` symlink, restarts and health-checks. **Rollback:**
`sudo ln -sfn /opt/handup/releases/<previous> /opt/handup/current && sudo systemctl restart handup`.
Logs: `journalctl -u handup -f`, `journalctl -u caddy -f`.

## Alternative: Vercel + Neon

Not used. The app also runs on Vercel with a Neon integration (branch per preview) if the VPS is unavailable: import
the repo, add `JWT_SECRET`, set the build command to `prisma migrate deploy && next build`.

## Release flow

PR opened → CI (lint, typecheck, unit, integration, build, E2E) + security (npm audit, gitleaks, Semgrep) →
PR preview deploy + `@smoke` on the preview URL → partner review → merge (merge commit, never squash) → production
deploy + `@smoke` on the production URL. Rollback: see above (previous release + restart).
