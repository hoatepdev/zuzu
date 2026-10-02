# ZUZU production

## Infrastructure

Use three independent environments: development, staging, production. Each needs its own PostgreSQL database and credentials. Production needs:

- HTTPS web host for the Vite build
- HTTPS API host for the NestJS service
- managed PostgreSQL with persistent storage, SSL and automated backups
- one shop computer running Print Agent with outbound internet and the ZY908 attached

Do not expose Print Agent port 3210 or any shop LAN port to the internet.

## Environment variables

API:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/zuzu?sslmode=require&schema=public
SESSION_SECRET=<random-long-secret>
CORS_ORIGIN=https://app.example.com
WEB_URL=https://app.example.com
PRINT_AGENT_TOKEN=<random-long-agent-secret>
PRINT_JOB_CLAIM_TIMEOUT_MS=60000
PORT=3100
```

Web build:

```bash
VITE_API_URL=https://api.example.com
```

Print Agent:

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

Store secrets in the hosting provider's secret manager. Never commit `.env`, database credentials, session cookies, or `PRINT_AGENT_TOKEN`.

## Initial deployment

1. Create production PostgreSQL with SSL, persistent storage and automated backups.
2. Set API variables and build: `npm ci && npm run build --workspace @zuzu/api`.
3. Before starting the new API release, run `npm run db:migrate:deploy` once from the release artifact.
4. Start API with `npm run start:prod --workspace @zuzu/api`.
5. Build web with production `VITE_API_URL`: `npm run build --workspace @zuzu/web` and serve `apps/web/dist` through HTTPS.
6. Configure DNS/TLS and redirect all HTTP requests to HTTPS.
7. Verify `GET https://api.example.com/health` returns `{"ok":true,"database":"connected"}`.
8. Install Print Agent on the shop computer and configure it to restart at login/boot using the operating system's service manager.

Never use `prisma migrate dev` in staging or production.

## Release and rollback

- Take or confirm a fresh provider backup before a schema-changing release.
- Apply forward-only migrations with `prisma migrate deploy`, then start the matching API build.
- For application regressions without incompatible schema changes, redeploy the previous API/web build.
- Do not manually delete migration rows or roll back SQL on the live database. If a migration is incompatible, stop writes, restore into a new database, point the previous release at it, and verify before reopening traffic.

## Sessions, CORS and HTTPS

`app.example.com` and `api.example.com` are different origins but the same HTTPS site. ZUZU uses an `HttpOnly`, `Secure`, `SameSite=Lax` host-only cookie and an exact `CORS_ORIGIN` with credentials. Do not use wildcard CORS. Both hosts must use trusted HTTPS certificates; camera QR scanning on phones requires HTTPS.

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

Use the managed PostgreSQL provider's native automated backups unless it cannot meet this policy:

- one backup every day
- retain at least 14 daily backups
- encrypt backup storage and restrict access to Owner/operator accounts
- keep backups in provider-managed storage separate from the running database
- enable point-in-time recovery when included by the provider, but do not use it instead of daily retention

Record the provider, schedule, retention and last successful restore test in the operations log.

### Restore test

Run at least quarterly and after changing provider/backup settings:

1. Choose a recent production backup.
2. Restore it to a new isolated database, never over production.
3. Use staging credentials to run `npm run db:migrate:deploy` against the restored database.
4. Start a staging API against it and verify `/health`.
5. Verify counts and recent records for users, orders, payments, audit logs and print jobs.
6. Perform login, open an order and inspect its print history. Do not let the staging agent poll production jobs.
7. Record backup timestamp, restore duration, verification result and operator.
8. Delete the isolated restore after verification according to the provider's secure deletion process.

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
