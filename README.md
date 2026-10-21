# Sand Valley: API + dashboard

Monorepo (npm workspaces):

| Folder | What |
|---|---|
| `backend/` | Express 5 + MongoDB API (used by the Flutter app and the dashboard) |
| `frontend/` | Admin dashboard (Vite, React, axios, framer-motion, react-icons) |

## Run on a server with Docker

Needs Docker with the compose plugin. Everything (MongoDB, API, dashboard) runs from one command.

```bash
cp .env.example .env
#   fill in MONGO_ROOT_PASSWORD (letters/digits), JWT_SECRET, EMAIL_USER/EMAIL_PASS,
#   PUBLIC_BASE_URL (the address people use, e.g. https://admin.example.com) and WEB_PORT

docker compose up -d --build

# first time only: create the empty catalog and the admin account
docker compose run --rm backend node backend/scripts/seed.mjs
```

The seed prints the admin username and, if `ADMIN_PASSWORD` was empty, a generated password (shown once).
Set a new admin password any time with `docker compose run --rm -e ADMIN_PASSWORD='new-password' backend node backend/scripts/seed.mjs --reset-password`.

Open `http://<server>:<WEB_PORT>` for the dashboard. The Flutter app talks to `<PUBLIC_BASE_URL>/api/auth`.

| Part | Details |
|---|---|
| `web` | nginx: serves the dashboard, proxies `/api` to the API, serves `/uploads` straight from the images volume |
| `backend` | the API, runs as a non-root user, not published to the host |
| `mongo` | MongoDB 7 with a password, not published to the host |
| volumes | `mongo-data` (database) and `uploads` (images). **Back up both.** |

HTTPS: put Caddy, Traefik or a host nginx with a certificate in front of `web` (forward `X-Forwarded-Proto`), and set `PUBLIC_BASE_URL` to the `https://` address.

Update to a new version: `git pull && docker compose up -d --build`. Data and images stay in the volumes.

Backups (example):

```bash
docker compose exec -T mongo sh -c 'mongodump -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --archive --gzip' > mongo-$(date +%F).gz
docker run --rm -v sandvalley_uploads:/data -v "$PWD":/out alpine tar czf /out/uploads-$(date +%F).tgz -C /data .
```

## Develop locally

```bash
npm install
npm run dev:api     # API on :5000 (needs backend/.env, see backend/.env.example)
npm run dev:web     # dashboard on :5173, proxies /api and /uploads to :5000
```

Create the first admin on a fresh database: `ADMIN_PASSWORD=... node backend/scripts/seed.mjs`.

## Tests

```bash
npm run e2e                  # build + start a throwaway stack, run API tests then browser tests, tear it down
npm run e2e -- --keep        # leave the stack running at http://localhost:8090 (admin / E2E-admin-pass-1)
npm run e2e -- --no-build    # reuse the images from the last run
npm run e2e -- --api         # only the API tests      (--ui: only the browser tests)
npm run e2e -- -g "forgot"   # extra arguments go to Playwright
```

The run uses `docker-compose.e2e.yml`: its own empty in-memory MongoDB, mail in dry-run mode (the text of each message is written to the API log, which is how the tests read forgot-password codes) and no rate limits. It never touches your real database. Browser tests use your installed Chrome (`E2E_BROWSER=chromium` for Playwright's own). The report is in `e2e/playwright-report`.

`npm test` runs only the API tests against a server you started yourself (`BASE`, `ADMIN_USER`, `ADMIN_PASS`); they write to whatever database that server uses and delete what they create.
