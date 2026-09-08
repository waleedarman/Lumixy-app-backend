# Lumixy staging — production-like performance environment

**Do not deploy from this folder automatically.** These are templates for a Linux staging host used for realistic k6 scalability testing.

**Not the target architecture:** WAMP, `php artisan serve`.

**Target architecture:**

```text
k6 / clients
    ↓
Nginx
    ↓
PHP-FPM (1..N Laravel app instances behind one or more hosts)
    ↓
Redis  (cache + sessions + queues + locks + rate limits)
MySQL
Queue workers (Supervisor)
Bunny CDN  (images/files — direct to clients)
```

Phase 2 features (e.g. `/api/bootstrap`) are **out of scope**. This pack only prepares Phase 1 for correct load testing.

---

## 1. Redis install (Ubuntu/Debian example)

```bash
sudo apt update
sudo apt install -y redis-server
sudo systemctl enable --now redis-server
redis-cli ping   # → PONG
```

PHP extension (prefer phpredis):

```bash
sudo apt install -y php8.3-redis   # match your PHP-FPM version
# or: pecl install redis
```

Confirm in `php -m | grep redis`.

---

## 2. Environment

```bash
cd /var/www/lumixy/backend
cp .env.staging.example .env
php artisan key:generate
# fill DB_*, REDIS_*, BUNNY_*, FIREBASE_*, APP_URL, TRUSTED_*
```

Required for staging load tests:

| Variable | Staging value |
|----------|----------------|
| `CACHE_STORE` | `redis` |
| `SESSION_DRIVER` | `redis` |
| `SESSION_CONNECTION` | `default` |
| `QUEUE_CONNECTION` | `redis` |
| `APP_MAINTENANCE_DRIVER` | `cache` |
| `APP_MAINTENANCE_STORE` | `redis` |
| `REDIS_*` | host/port/dbs as in example |

**Local laptop without Redis:** keep `CACHE_STORE=file`, `SESSION_DRIVER=file`, `QUEUE_CONNECTION=database` (or `*_with_*_fallback` stores). Do not force Redis on broken local installs.

---

## 3. Verify Redis + Phase 1 cache/queue

```bash
php artisan config:clear
php artisan lumixy:verify-staging
php artisan lumixy:verify-staging --dispatch-fcm-probe
php artisan queue:work redis --once
```

This checks:

- cache / sessions drivers (reported)
- Redis ping (default + cache connections)
- cache put/get
- cache locks (used by `PublicApiCache` stampede protection)
- `PublicApiCache` single-builder behavior
- queue connection
- optional FCM job dispatch onto Redis

---

## 4. Queue workers

```bash
php artisan queue:work redis --sleep=1 --tries=3 --timeout=90
```

Production-like (Supervisor): see `supervisor-lumixy-worker.conf`.

Firebase approve/reject/broadcast/expiry pushes are queued (`SendFirebasePushNotification`). Without a worker, in-app DB notifications still exist but FCM will wait in Redis.

---

## 5. Nginx + PHP-FPM

1. Copy `nginx-lumixy-staging.conf` → `/etc/nginx/sites-available/lumixy-staging`
2. Point `root` at `.../backend/public`
3. Copy `php-fpm-lumixy-staging.conf` pool fragment or merge settings into your pool
4. `sudo nginx -t && sudo systemctl reload nginx`
5. `sudo systemctl reload php8.3-fpm`

Optimize for load tests (starting points, tune later):

- PHP-FPM `pm = dynamic`, raise `pm.max_children` based on RAM
- MySQL `max_connections` above expected concurrent PHP workers
- Redis `maxmemory-policy` (e.g. `allkeys-lru`) with enough memory for cache

---

## 6. Multi-instance checklist

| Concern | Staging requirement |
|---------|---------------------|
| Cache | Redis (not `file`) |
| Sessions | Redis (not `file`) |
| Queue | Redis + shared workers |
| Rate limiting | Uses default cache → Redis |
| `PublicApiCache` locks | Redis lock connection |
| Maintenance mode | `cache` driver + Redis store |
| Media | Bunny CDN URLs (no local public disk for product images) |
| Logs | Prefer centralized/daily logs; do not rely on one node's `storage/logs` alone |

Sanctum tokens and idempotency keys remain in **MySQL** (already shared) — OK for horizontal scale.

---

## 7. App deploy steps (staging host)

```bash
cd /var/www/lumixy/backend
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan storage:link   # only if you still serve any local public files
sudo supervisorctl reread && sudo supervisorctl update
sudo supervisorctl start lumixy-worker:*
```

Health:

```bash
curl -sS https://staging.example.com/api/test
php artisan lumixy:verify-staging
```

---

## 8. k6 against staging

From your machine (or a separate load generator — **not** the same tiny box as MySQL if possible):

```bash
cd /path/to/backend

# Progressive guest startup (cap with MAX_VUS; do NOT jump to 20000 on a laptop)
k6 run -e BASE_URL=https://staging.example.com -e MAX_VUS=1000 k6-tests/guest-startup-progressive.js

# Existing Phase 1 scripts
k6 run -e BASE_URL=https://staging.example.com k6-tests/guest-startup-load.js
k6 run -e BASE_URL=https://staging.example.com k6-tests/guest-startup-spike.js
```

Summaries write under `k6-tests/results/` when you run from the **backend** directory.

Suggested progression (raise only after the previous step is healthy):

```text
100 → 500 → 1000 → 2500 → 5000 → 10000 → 20000
```

**Do not run 20,000 VUs against WAMP or a developer laptop.**

---

## 9. Monitor during k6

| Signal | Why |
|--------|-----|
| CPU (Nginx, PHP-FPM, MySQL, Redis) | Saturation → latency cliffs |
| RAM / swap | FPM workers + Redis eviction |
| Redis `INFO stats` / memory / blocked clients | Cache + locks + queue depth |
| MySQL threads_connected, Threads_running | Connection storms |
| MySQL slow query log | `whereHas` / catalog misses |
| `http_reqs` rate | Throughput |
| p95 / p99 latency | SLO: aim p95 &lt; 1s for guest startup |
| `http_req_failed` | Aim &lt; 1% |
| Queue lag (`queue:work`, Redis list length) | FCM backlog under admin write load |
| PHP-FPM listen queue / max children | 502/504 under spike |

---

## 10. Bunny CDN

Keep `BUNNY_CDN_URL` set. Clients must load images from Bunny, not through Laravel. Staging load tests for guest startup do not need to hammer image URLs.
