# ZUZU production

## Infrastructure

One VPS runs everything for the single-shop pilot:

- **Docker Compose** (`docker-compose.prod.yml`) — PostgreSQL 17 + ZUZU API (NestJS) + Caddy
- **Caddy** — serves the Vite web build at `app.<domain>`, reverse-proxies `api.<domain>` to the API, automatic HTTPS via Let's Encrypt (`deploy/Caddyfile`)
- **Shop computer** — Print Agent, outbound-only polling over HTTPS, ZY908 attached

One parent domain with two A records pointing at the VPS IP: `app.<domain>` and `api.<domain>`. Same-site subdomains keep the auth cookie working in every browser, including iPhone Safari.

Only ports 22/80/443 should be open on the VPS. PostgreSQL is not published to the internet. Do not expose Print Agent port 3210 or any shop LAN port to the internet.

Prerequisites on the VPS: Docker with the compose plugin, git, and a clone of this repo. 1 vCPU / 1 GB RAM is enough for the pilot.

## Environment variables

Everything lives in `.env.production` on the VPS (copy from `.env.production.example`; generate secrets with `openssl rand -hex 32`). Compose reads it with `--env-file` and passes it to the containers:

```bash
NODE_ENV=production
DB_PASSWORD=<strong-postgres-password>
SESSION_SECRET=<random-long-secret>
PRINT_AGENT_TOKEN=<random-long-agent-secret>
PRINT_JOB_CLAIM_TIMEOUT_MS=60000

API_DOMAIN=api.example.com
WEB_DOMAIN=app.example.com
ACME_EMAIL=you@example.com

CORS_ORIGIN=https://app.example.com
WEB_URL=https://app.example.com
VITE_API_URL=https://api.example.com
```

`DATABASE_URL` is assembled inside compose (`postgresql://zuzu:${DB_PASSWORD}@db:5432/zuzu`). The API listens on port 3100 internally and binds `0.0.0.0`; Caddy is the only thing facing the internet.

Print Agent (shop computer, `apps/print-agent/.env`):

```bash
NODE_ENV=production
ZUZU_API_URL=https://api.example.com
PRINT_AGENT_TOKEN=<same-agent-secret-as-api>
PRINTER_CONNECTION=usb
PRINTER_VENDOR_ID=<device-vendor-id>
PRINTER_PRODUCT_ID=<device-product-id>
PRINTER_ENCODING=utf8
POLL_INTERVAL_MS=2000
```

Never commit `.env.production`, database credentials, session secrets, or `PRINT_AGENT_TOKEN`.

## Deploying on the VPS

1. Point DNS A records `app.<domain>` and `api.<domain>` at the VPS IP.
2. On the VPS: `git clone` this repo, create `.env.production` from the example, fill real values.
3. Start everything:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
   ```

   What happens: Postgres starts with a persistent volume (`pgdata`) → the API container waits for it, runs `prisma migrate deploy`, then starts (`apps/api/Dockerfile` CMD) → Caddy obtains certificates and serves `app.<domain>` (static files from `apps/web/dist`, SPA fallback via `try_files`) and `api.<domain>` (reverse proxy).
4. Verify `GET https://api.<domain>/health` returns `{"ok":true,"database":"connected"}` before touching the frontend.
5. Verify `https://app.<domain>` loads and direct navigation to `/orders/ZU-0001`, `/receive`, `/scan`, `/customers` works (SPA fallback).

Never use `prisma migrate dev` against staging or production.

### Everyday operations

```bash
docker compose -f docker-compose.prod.yml logs -f api          # logs
docker compose -f docker-compose.prod.yml up -d --build        # deploy latest code (git pull first)
docker compose -f docker-compose.prod.yml restart api          # restart API only
```

## First Owner account (production bootstrap)

Production never runs the development seed (`prisma db seed` creates `owner/manager/staff` with password `zuzu123` — development only). Bootstrap creates exactly one Owner plus the default service catalog, with the password supplied through the environment and never logged:

```bash
docker compose -f docker-compose.vps.yml exec \
  -e BOOTSTRAP_OWNER_USERNAME=<username> \
  -e BOOTSTRAP_OWNER_PASSWORD=<strong-temporary-password> \
  api node dist-scripts/prisma/bootstrap.js
```

(Inside the container the bootstrap/seed scripts are pre-compiled to `dist-scripts/`; `npm run db:bootstrap` with ts-node is for local development only.)

Change the temporary password at first login, then create the real staff accounts from the management UI.

## Staging before production (single-VPS pilot sequence)

For the pilot, staging and production share one VPS **sequentially, never concurrently**: deploy first as staging, verify, then reset to production. If a permanent separate staging environment is ever needed, repeat this setup on a second VPS.

1. Deploy as above, then seed development test accounts:

   ```bash
   docker compose -f docker-compose.vps.yml exec api node dist-scripts/prisma/seed.js
   ```

2. Run the full staff flow from a real phone: login → Receive → order with multiple services + edited price → READY_FOR_PICKUP → payment → COMPLETED.
3. Run print QA with a local Print Agent (`PRINTER_CONNECTION=console` first, real ZY908 after): agent stopped → job stays queued; restart → claimed; failures → retries → FAILED; IN LẠI BILL → new job.
4. **Promote to production**: `docker compose -f docker-compose.prod.yml down`, delete the volume (`docker volume rm <project>_pgdata`), rotate `DB_PASSWORD`/`SESSION_SECRET`/`PRINT_AGENT_TOKEN` in `.env.production`, `up -d --build`, then bootstrap the Owner account. All staging test data is destroyed; nothing is carried over.

## Production verification

After promotion, verify: health, login/logout, role guards, camera/QR, order creation, multi-service + editable price, payment, print queue, agent, ZY908 — and test on a real iPhone (Safari) and Android (Chrome).

## Release and rollback

- Take or confirm a fresh backup before a schema-changing release.
- Deploying = `git pull && docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build`; migrations apply forward-only on boot.
- For application regressions without incompatible schema changes, roll back with `git checkout <previous-tag>` and rebuild.
- Do not manually delete migration rows or roll back SQL on the live database. If a migration is incompatible, stop writes, restore into a new database, point the previous release at it, and verify before reopening traffic.

## Sessions, CORS and HTTPS

Production uses `app.<domain>` and `api.<domain>` — different origins but the same site. ZUZU sets an `HttpOnly`, `Secure`, `SameSite=Lax` host-only cookie and an exact `CORS_ORIGIN` with credentials. Do not use wildcard CORS. Both hosts must use trusted HTTPS certificates; camera QR scanning on phones requires HTTPS.

Never deploy the web and API on unrelated sites (e.g. a `*.pages.dev` frontend against the VPS API): `SameSite=Lax` would silently break login, and `COOKIE_SAMESITE=none` (a supported escape hatch for exactly that topology) is blocked by iPhone Safari. Same-parent-domain subdomains are the production answer.

Verify login, logout, role guards, account deactivation and an expired session from the production web origin.

## Print queue operations

Order creation commits the order and `PrintJob` in one transaction. The agent claims jobs atomically, retries failures up to three attempts, then leaves them `FAILED`. **IN LẠI BILL** creates a new job; it does not erase history.

Delivery is at least once. If paper prints and the agent loses power before success reaches the API, the lease expires and the job may print again. Staff should compare the order code and discard duplicates.

Troubleshooting:

1. Confirm API `/health` and shop internet.
2. Check agent logs for `connection_error`, `ack_error`, or printer errors. Logs contain IDs, not secrets or full phone numbers.
3. Confirm `ZUZU_API_URL` is HTTPS and the two `PRINT_AGENT_TOKEN` values match.
4. For USB errors, check power/cable/VID/PID; unplug and reconnect. The next attempt opens the device again.
5. After three failures, fix the printer and use **IN LẠI BILL** on the order.
6. Print a test receipt in development mode if hardware isolation is needed.

## Backups

A VPS has **no provider-side backups** — backup is entirely our job. Policy for the pilot: daily dump, retain 14 days, copy off the VPS (if the VPS disk dies, on-box backups die with it).

1. Create the backup directory and add a root cron entry (`crontab -e`):

   ```
   0 2 * * * docker exec zuzu-db pg_dump -U zuzu zuzu | gzip > /root/zuzu-backups/zuzu-$(date +\%F).sql.gz && find /root/zuzu-backups -name 'zuzu-*.sql.gz' -mtime +14 -delete
   ```

   (`zuzu-db` is the fixed container name set in `docker-compose.prod.yml`.)
2. Copy dumps off-box — e.g. from the shop computer nightly: `scp root@<vps>:/root/zuzu-backups/zuzu-$(date +%F).sql.gz .` — or `rclone` to any private cloud storage.

Record the schedule, retention and last successful restore test in the operations log.

### Restore

1. Restore into a new database first, never over the live one:

   ```bash
   gunzip -c /root/zuzu-backups/zuzu-<date>.sql.gz | \
     docker exec -i zuzu-db psql -U zuzu -d zuzu_restore
   ```

   (`docker exec zuzu-db psql -U zuzu -c 'CREATE DATABASE zuzu_restore'` first.)
2. Verify counts and records in `zuzu_restore` (users, orders, payments, audit, print jobs).
3. To actually recover: stop writes (`docker compose -f docker-compose.prod.yml stop api`), drop and recreate `zuzu` from the dump, start the API, verify `/health` and login.

### Restore test

Run at least quarterly and after changing backup settings:

1. Choose a recent backup and restore it to `zuzu_restore` as above.
2. Verify counts and recent records for users, orders, payments, audit logs and print jobs.
3. Spot-check login data and one order's print history (read-only queries).
4. Record backup timestamp, restore duration, verification result and operator.
5. Drop `zuzu_restore` after verification.

A backup is not verified until this restore procedure succeeds.

## Production verification checklist

### Authentication

- [ ] Login and logout
- [ ] Staff/Manager/Owner guards
- [ ] Expired and deactivated sessions
- [ ] Cookie is HttpOnly and Secure; CORS allows only production web

### Staff flow

- [ ] Create anonymous-customer order
- [ ] Create existing-customer order
- [ ] QR lookup
- [ ] Weigh/complete
- [ ] Payment/return

### Printing

- [ ] Agent online claims and prints one queued job
- [ ] Agent offline leaves order and job safely queued
- [ ] Printer offline retries, then shows FAILED
- [ ] Manual reprint creates a new job
- [ ] ZY908 output and QR scan correctly
- [ ] Restart/sleep/unplug/replug recovery

### Database

- [ ] `prisma migrate deploy` succeeds on staging clone
- [ ] Daily backup exists and 14-day retention is configured
- [ ] Isolated restore test completed and recorded

### Mobile and HTTPS

- [ ] Web and API reject or redirect plain HTTP
- [ ] Camera works on iPhone Safari
- [ ] Camera works on Android Chrome
- [ ] Staff flow works at 375px and 430px widths

## Logging

Keep API startup, migration output, order creation errors, print-job lifecycle and agent connectivity/errors. Never log passwords, cookies, database URLs, tokens, receipt payloads, or full customer phone numbers.
