# Deployment

ChronicleIdle is a static single-page application. There is no backend. Any static host works;
this guide covers the two targets from the brief: an **Ubuntu VPS with nginx** and **Vercel**.
Both serve the same `dist/` output from `pnpm build`.

## 1. Build

```
pnpm install --frozen-lockfile
pnpm build            # runs assets:build → typecheck → vite build → dist/
```

`dist/` contains hashed, immutable assets under `dist/assets/` and the entry `index.html`.
Requirements: Node 22 LTS, pnpm 10, ~2 GB RAM for the asset pipeline (sharp).

**Verified for 0.0.0 (Phase 0).** `pnpm build` produces `dist/` (app shell ≈ 310 kB of gzipped
JS on the title route, 338 precached entries); `pnpm preview` serves it with the same static
semantics as nginx/Vercel (SPA fallback to `index.html`, hashed assets) and the Playwright suite
runs against that output. The nginx and Vercel guides below were reviewed against this build;
no live VPS or Vercel deployment was performed from the development environment, so the first
real deploy should walk §2 or §3 once and confirm the service worker updates (§5).

## 2. Ubuntu VPS (nginx)

Tested target: Ubuntu 24.04 LTS, 1 vCPU / 1 GB RAM is enough (2 GB if you build on the box).

### 2.1 One-time server setup

```bash
# as root or with sudo
apt update && apt install -y nginx git curl unzip
# Node 22 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt install -y nodejs
corepack enable && corepack prepare pnpm@10 --activate
# deploy user
adduser --disabled-password --gecos "" deploy
mkdir -p /var/www/chronicleidle && chown -R deploy:deploy /var/www/chronicleidle
# firewall
ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw --force enable
```

### 2.2 nginx site

`/etc/nginx/sites-available/chronicleidle`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name play.example.com;          # your domain
    root /var/www/chronicleidle/current;
    index index.html;

    # gzip (brotli if the module is installed)
    gzip on; gzip_types text/plain text/css application/javascript application/json image/svg+xml; gzip_min_length 1024;

    # hashed build assets: cache forever
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }
    # generated game assets (also hashed by the pipeline manifest)
    location /assets/generated/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }
    # service worker and web manifest: never cached (they gate updates)
    location = /sw.js { add_header Cache-Control "no-cache"; try_files $uri =404; }
    location = /manifest.webmanifest { add_header Cache-Control "no-cache"; try_files $uri =404; }
    # everything else: SPA fallback, no cache for index.html
    location / {
        add_header Cache-Control "no-cache";
        try_files $uri /index.html;
    }

    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy strict-origin-when-cross-origin;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()";
}
```

```bash
ln -s /etc/nginx/sites-available/chronicleidle /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

### 2.3 HTTPS

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d play.example.com
```
Certbot installs auto-renewal. HTTPS is required for `crossOriginIsolated` features later
(WebGPU works without it, SharedArrayBuffer would not).

### 2.4 Deploy script (build on the server)

`/home/deploy/deploy.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
REPO=https://github.com/justmarvinai/ChronicleIdle.git
BASE=/var/www/chronicleidle
TS=$(date +%Y%m%d%H%M%S)
git clone --depth 1 --branch main "$REPO" "$BASE/src-$TS"
cd "$BASE/src-$TS"
pnpm install --frozen-lockfile
pnpm build
mv dist "$BASE/release-$TS"
ln -sfn "$BASE/release-$TS" "$BASE/current"
rm -rf "$BASE/src-$TS"
# keep the last 3 releases
ls -dt "$BASE"/release-* | tail -n +4 | xargs -r rm -rf
echo "deployed $TS"
```

Atomic switch via the `current` symlink; rollback = point `current` at the previous release and
reload nothing (nginx follows the symlink).

### 2.5 Deploy from GitHub Actions (optional)

Add an SSH key for `deploy` as a repository secret and a workflow job that runs
`ssh deploy@host '/home/deploy/deploy.sh'` after CI passes on `main`. Alternatively build in CI
and `rsync -az --delete dist/ deploy@host:/var/www/chronicleidle/release-$SHA/` then switch the
symlink — this keeps the VPS build-free (1 GB RAM is then plenty).

## 3. Vercel

1. Import the GitHub repository in Vercel. Framework preset: **Vite**. Build command
   `pnpm build`, output directory `dist`, install command `pnpm install --frozen-lockfile`.
   Node version 22 (Project Settings → General).
2. Add `vercel.json` (Phase 0 ships it):

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    { "source": "/assets/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
    { "source": "/index.html", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
    { "source": "/sw.js", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] },
    { "source": "/manifest.webmanifest", "headers": [{ "key": "Cache-Control", "value": "no-cache" }] }
  ]
}
```

3. Every push to `main` deploys production; other branches get preview URLs (useful even though
   the workflow is main-only).

Vercel build limits (function-less static build, 45 min) are far above what the asset pipeline
needs (~2–3 min).

## 4. Continuous integration (`.github/workflows/ci.yml`, Phase 0)

On every push and pull request: `pnpm install --frozen-lockfile` → `pnpm assets:build` → the
committed manifest is checked for drift → `pnpm content:validate` → `pnpm typecheck` → `pnpm lint`
→ `pnpm test` → `pnpm sim:balance --strict` → `pnpm sim:economy --strict` → `pnpm build` →
`pnpm perf:budget --strict`, then `pnpm test:e2e` in two shards, with `pnpm perf:lighthouse
--strict` on the first. Artifacts: the Playwright report on failure, including the walkthrough
video. A red `main` blocks the VPS deploy job.

## 4.1 What was verified for `0.1.0`, and what could not be

The release was prepared in a container with no nginx, no VPS and no Vercel account, so the parts
of this guide that need a server were verified as far as a build can be:

- **The build is servable by a dumb static file server.** `dist/` served through
  `python3 -m http.server` — no rewrites, no fallback, no framework — returns 200 with the right
  content type for `/`, `/index.html`, `/sw.js`, `/manifest.webmanifest` and `/robots.txt`. The
  game needs nothing of its host but files.
- **Both configurations match the build they serve.** Every path §2.2's nginx site and
  `vercel.json` name exists in `dist/`, and their cache rules agree: hashed assets immutable for a
  year, `index.html`, `sw.js` and the web manifest never cached, which is what gates updates.
- **The SPA fallback is a safety net, not a requirement.** The router keeps its state in the store
  and its only URL surface is a `?screen=` query parameter — nothing calls `pushState` — so no
  deep path ever needs rewriting to `index.html`.
- **Not verified from here:** `nginx -t` against a real server, the certbot step, the
  `deploy.sh` release-and-symlink dance, and a Vercel production deployment. Each is a documented
  command against infrastructure this environment does not have; they need one run on the owner's
  VPS and one `vercel --prod` before the link is handed to anyone.

## 5. Updating and rollback

- Update: push to `main` (or run `deploy.sh`). Saves are local to the player's browser and are
  forward-migrated by the save-migration system, so updates never wipe progress. Never change a
  save schema without a migration and a fixture test.
- Rollback: VPS → repoint `current`; Vercel → "Promote to Production" on a previous deployment.
  Rolling back to a build with an older `saveVersion` than a player's save shows the "newer save"
  panel and refuses to load it destructively (export is still offered).

## 6. The Windows desktop build (planned)

The desktop game is planned on the `production` branch in phases D0–D6 (`docs/tech/ELECTRON.md`):
the same `dist/` served to an Electron window from an `app://` protocol, `platform/` adapters
switched to save files and native dialogs, packaging with electron-builder, and Steam in the main
process only. Nothing in this guide changes for the web build.
