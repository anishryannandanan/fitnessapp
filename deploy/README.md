# Deploying FitCore on a VPS (Docker + Caddy + Cloudflare)

This bundle runs FitCore as a **self-contained Docker stack** — its own PostgreSQL,
the NestJS API, and the React web app — isolated from anything else on your VPS.
Only **one port** is published (to `127.0.0.1`), and your existing **Caddy** reverse-proxies
a subdomain to it. HTTPS is handled by Caddy + Cloudflare.

```
Browser ──HTTPS──> Cloudflare ──> Caddy (host) ──> 127.0.0.1:8090 ──> web (nginx)
                                                                       ├─ /            static SPA
                                                                       └─ /api/  ─────> api:3000 (NestJS)
                                                                                         └─> postgres:5432
```

Because the web container proxies `/api` to the API internally, everything is **same-origin**
(no CORS headaches, one subdomain, one Caddy line).

---

## 1. Prerequisites

- A VPS with **Docker** + **Docker Compose v2** (`docker compose version`).
- **Caddy** already running on the host (you have this).
- A **subdomain** pointed at the VPS in Cloudflare, e.g. `gym.yourdomain.com`.

## 2. Get the code

```bash
git clone https://github.com/anishryannandanan/fitnessapp.git
cd fitnessapp
# make sure you're on the latest main (with all features merged)
git checkout main && git pull
```

## 3. Configure environment

```bash
cp deploy/.env.example deploy/.env
nano deploy/.env
```

Set at minimum:
- `PUBLIC_URL` → `https://gym.yourdomain.com` (your subdomain)
- `POSTGRES_PASSWORD` → a strong password
- `JWT_SECRET` → a long random string (`openssl rand -base64 48`)
- `SEED_OWNER_PASSWORD` / `SEED_DEFAULT_PASSWORD` → your own passwords

> `PUBLIC_URL` is baked into the web build (as `VITE_API_URL`) **and** used for CORS,
> so set it correctly before building. If you later change the subdomain, rebuild the web image.

## 4. Build & start

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```

On first boot the API container will:
1. `prisma db push` — create the schema.
2. Seed the business, branches, and demo users (because `SEED_ON_START=true`).
3. Start the server.

Check it locally on the VPS:

```bash
curl -I http://127.0.0.1:8090            # web (should be 200)
curl http://127.0.0.1:8090/api/v1/health # API through the web proxy (if a health route exists)
docker compose -f deploy/docker-compose.yml logs -f api
```

> **Turn off seeding after the first successful deploy:** set `SEED_ON_START=false`
> in `deploy/.env` and run the `up -d` command again (no `--build` needed).

## 5. Point Caddy at it

Add this block to your `Caddyfile` (usually `/etc/caddy/Caddyfile`):

```caddy
gym.yourdomain.com {
    encode gzip
    reverse_proxy 127.0.0.1:8090
}
```

Reload Caddy:

```bash
sudo systemctl reload caddy   # or: caddy reload --config /etc/caddy/Caddyfile
```

## 6. Cloudflare / SSL notes

Caddy issues its own certificate automatically. With Cloudflare in front, pick **one**:

- **Recommended — Cloudflare Origin Certificate:** In Cloudflare → SSL/TLS → Origin Server,
  create an Origin Certificate, save the cert + key on the VPS, and tell Caddy to use it:

  ```caddy
  gym.yourdomain.com {
      tls /etc/caddy/certs/gym.crt /etc/caddy/certs/gym.key
      reverse_proxy 127.0.0.1:8090
  }
  ```
  Then set Cloudflare SSL/TLS mode to **Full (strict)**. The orange cloud (proxy) can stay on.

- **Alternative — let Caddy get a Let's Encrypt cert:** Cloudflare's proxy can intercept the
  ACME HTTP challenge. Either temporarily set the DNS record to **DNS only** (grey cloud) until
  Caddy issues the cert, then re-enable the proxy; or use the Caddy Cloudflare-DNS plugin for a
  DNS-01 challenge. Set Cloudflare SSL/TLS mode to **Full (strict)** afterwards.

> Avoid the **Flexible** SSL mode — it causes redirect loops with Caddy's HTTPS.

## 7. Log in

Open `https://gym.yourdomain.com`. Default seeded logins (change these via `.env` before deploy):

| Role  | Email                         | Password (from `.env`)     |
|-------|-------------------------------|----------------------------|
| Owner | `owner@fitnessworld.in`       | `SEED_OWNER_PASSWORD`      |
| Staff | `manager.kochi@fitnessworld.in` | `SEED_DEFAULT_PASSWORD`  |

## Common operations

```bash
# View logs
docker compose -f deploy/docker-compose.yml logs -f

# Restart after editing .env
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d

# Rebuild after pulling new code
git pull && docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build

# Stop everything (data is preserved in the fitcore_pgdata volume)
docker compose -f deploy/docker-compose.yml down

# Back up the database
docker compose -f deploy/docker-compose.yml exec postgres \
  pg_dump -U fitcore fitcore > fitcore-backup-$(date +%F).sql
```

## Updating to a new subdomain

`VITE_API_URL` is compiled into the web bundle. If you change `PUBLIC_URL`, rebuild:

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build web
```
