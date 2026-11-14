#!/usr/bin/env bash
# Deploys HandUp to a small Debian VPS (#2). Run from the repo root on a machine with Docker:
#
#   VPS=ruoyu@136.65.108.193 SSH_KEY=~/.ssh/gcp_discord_bot bash scripts/deploy-vps.sh
#
# 1. First run only: creates the database, role, secrets file and a small Postgres config on the VPS.
# 2. Inside Docker (the VPS has 1 GB RAM, too little to build on): builds a Linux standalone bundle and runs
#    `prisma migrate deploy` against the VPS database through an SSH tunnel.
# 3. Uploads the bundle as a new release, switches the `current` symlink, restarts, health-checks.
# Releases are kept in /opt/handup/releases; roll back by pointing `current` at the previous one and restarting.
set -euo pipefail

VPS="${VPS:?set VPS=user@host}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
HANDUP_HOST="${HANDUP_HOST:-$(echo "${VPS#*@}" | tr . -).sslip.io}"
NODE_IMAGE="node:22-bookworm-slim"
TUNNEL_PORT=15432
RELEASE="$(date -u +%Y%m%d%H%M%S)-$(git rev-parse --short HEAD)"
OUT="$(mktemp -d)"
SSH=(ssh -i "$SSH_KEY" -o BatchMode=yes "$VPS")
TUNNEL_PID=""
cleanup() { [ -n "$TUNNEL_PID" ] && kill "$TUNNEL_PID" 2>/dev/null; rm -rf "$OUT"; }
trap cleanup EXIT

echo "==> Preparing $VPS (first run creates the database and secrets)"
"${SSH[@]}" "sudo bash -s" <<'REMOTE'
set -euo pipefail
id handup >/dev/null 2>&1 || useradd --system --home /opt/handup --shell /usr/sbin/nologin handup
mkdir -p /opt/handup/releases /etc/handup
if [ ! -f /etc/handup/handup.env ]; then
  DB_PASS="$(openssl rand -hex 24)"
  sudo -u postgres psql -qc "CREATE ROLE handup LOGIN PASSWORD '$DB_PASS';"
  sudo -u postgres psql -qc "CREATE DATABASE handup OWNER handup;"
  umask 077
  cat > /etc/handup/handup.env <<ENV
NODE_ENV=production
PORT=3000
HOSTNAME=127.0.0.1
DATABASE_URL=postgresql://handup:$DB_PASS@127.0.0.1:5432/handup
JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
NEXT_TELEMETRY_DISABLED=1
ENV
  chown root:handup /etc/handup/handup.env && chmod 640 /etc/handup/handup.env
  echo "created database and /etc/handup/handup.env"
fi
CONF_DIR="$(ls -d /etc/postgresql/*/main | head -1)/conf.d"
if [ ! -f "$CONF_DIR/handup.conf" ]; then
  # Small Postgres for a 1 GB machine.
  printf "shared_buffers = 64MB\nmax_connections = 30\nwork_mem = 2MB\n" > "$CONF_DIR/handup.conf"
  systemctl restart postgresql
fi
REMOTE

echo "==> Opening an SSH tunnel to the VPS database"
DB_URL="$("${SSH[@]}" "sudo grep ^DATABASE_URL= /etc/handup/handup.env | cut -d= -f2-")"
ssh -i "$SSH_KEY" -o BatchMode=yes -o ExitOnForwardFailure=yes -N -L "$TUNNEL_PORT:127.0.0.1:5432" "$VPS" &
TUNNEL_PID=$!
sleep 3
# From inside Docker, the tunnel on this machine is reachable as host.docker.internal.
DB_URL_FROM_DOCKER="${DB_URL/127.0.0.1:5432/host.docker.internal:$TUNNEL_PORT}"

echo "==> Building and migrating in Docker"
git archive --format=tar HEAD > "$OUT/src.tar"
OUT_MOUNT="$(cd "$OUT" && (pwd -W 2>/dev/null || pwd))"
MSYS_NO_PATHCONV=1 docker run --rm --add-host=host.docker.internal:host-gateway \
  -e DATABASE_URL="$DB_URL_FROM_DOCKER" -v "$OUT_MOUNT:/out" "$NODE_IMAGE" bash -euc '
  mkdir /app && tar -xf /out/src.tar -C /app && cd /app
  npm ci --no-audit --no-fund >/dev/null
  npx prisma migrate deploy
  HANDUP_STANDALONE=1 NEXT_TELEMETRY_DISABLED=1 npm run build >/dev/null
  cp -r .next/static .next/standalone/.next/static
  cp -r public .next/standalone/public
  mkdir -p .next/standalone/.next/cache
  tar -czf /out/release.tar.gz -C .next/standalone .
'
kill "$TUNNEL_PID" 2>/dev/null || true
TUNNEL_PID=""
echo "==> Bundle: $(du -h "$OUT/release.tar.gz" | cut -f1)"

echo "==> Uploading and switching to release $RELEASE"
scp -i "$SSH_KEY" -o BatchMode=yes -q "$OUT/release.tar.gz" deploy/vps/handup.service deploy/vps/Caddyfile "$VPS:/tmp/"
"${SSH[@]}" "sudo HANDUP_HOST='$HANDUP_HOST' RELEASE='$RELEASE' bash -s" <<'REMOTE'
set -euo pipefail
mkdir -p "/opt/handup/releases/$RELEASE"
tar -xzf /tmp/release.tar.gz -C "/opt/handup/releases/$RELEASE"
chown -R handup:handup "/opt/handup/releases/$RELEASE"
install -m 644 /tmp/handup.service /etc/systemd/system/handup.service
sed "s/{\$HANDUP_HOST}/$HANDUP_HOST/" /tmp/Caddyfile > /etc/caddy/Caddyfile
rm -f /tmp/release.tar.gz /tmp/handup.service /tmp/Caddyfile
ln -sfn "/opt/handup/releases/$RELEASE" /opt/handup/current
systemctl daemon-reload
systemctl enable --quiet handup caddy
systemctl restart handup
systemctl reload caddy || systemctl restart caddy
ls -1dt /opt/handup/releases/* | tail -n +4 | xargs -r rm -rf   # keep the 3 newest releases
for i in $(seq 1 30); do curl -fsS http://127.0.0.1:3000/api/v1/health >/dev/null 2>&1 && break; sleep 1; done
echo "health: $(curl -fsS http://127.0.0.1:3000/api/v1/health)"
REMOTE

echo "==> Deployed $RELEASE: https://$HANDUP_HOST"
