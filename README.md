# CupCampaign

Full-stack beverage marketing automation system with a React frontend, Flask backend, and infrastructure services (PostgreSQL, MinIO) orchestrated via Docker Compose.

## Architecture

```
Client :80 ──> Nginx (reverse proxy)
                 ├── /          ──> React SPA (static files)
                 └── /api/*     ──> Flask backend :5000
                                      ├── PostgreSQL :5432
                                      └── MinIO      :9000
```

## Services

| Service      | Image                    | Ports              | Description                          |
| ------------ | ------------------------ | ------------------ | ------------------------------------ |
| **frontend** | node:20 / nginx:1.28     | 80                 | React (Vite) SPA + Nginx proxy       |
| **backend**  | python:3.11              | 5000               | Flask API served by Gunicorn          |
| **postgres** | postgres:18-alpine       | 5432               | Relational database                   |
| **minio**    | minio/minio:latest       | 9000 (API), 9001 (Console) | S3-compatible object storage |

## Quick Start

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Build and start all services:

   ```bash
   docker compose up --build -d
   ```

3. Verify services are running:

   ```bash
   docker compose ps
   curl http://localhost/api/health
   # {"status": "ok"}
   ```

4. (Optional) Seed the database with sample beverage data:

   ```bash
   docker compose exec backend python -m scripts.seed_database
   ```

## Environment Variables

| Variable             | Default               | Description                  |
| -------------------- | --------------------- | ---------------------------- |
| `POSTGRES_USER`      | `postgres`            | PostgreSQL username          |
| `POSTGRES_PASSWORD`  | `postgres`            | PostgreSQL password          |
| `POSTGRES_DB`        | `cup_campaign_db`     | PostgreSQL database name     |
| `MINIO_ROOT_USER`    | `minioadmin`          | MinIO root username          |
| `MINIO_ROOT_PASSWORD`| `minioadmin`          | MinIO root password          |
| `MINIO_ENDPOINT`     | `minio:9000`          | MinIO endpoint (internal)    |
| `DB_HOST`            | `postgres`            | Database host for Flask      |
| `DB_PORT`            | `5432`                | Database port for Flask      |
| `MY_APP_SECRET_KEY`  | —                     | JWT signing secret           |
| `GEMINI_API_KEY`     | —                     | Google Gemini API key        |

## API Endpoints

- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login (JWT via HttpOnly cookie)
- `POST /api/auth/logout` — Logout
- `GET  /api/stores` — List all stores
- `GET  /api/admin/products` — List products for current tenant
- `POST /api/admin/products` — Batch add products
- `POST /api/generate_post` — AI-generated marketing copy
- `POST /api/upload` — Upload image to MinIO
- `POST /api/content/generate-image` — AI image generation
- `POST /api/content/publish` — Publish marketing content
- `GET  /api/content/history` — Content history
- `POST /api/admin/platform/bind` — Bind Facebook page

## Development Mode

使用 `docker-compose.dev.yml` 啟動開發環境，支援前端 HMR 和後端 auto-reload，改 code 即時生效，無需重建 image。

```bash
docker compose -f docker-compose.dev.yml up -d
```

| Service      | 說明                                | URL                     |
| ------------ | ----------------------------------- | ----------------------- |
| **frontend** | Vite dev server (HMR)               | http://localhost:5173   |
| **backend**  | Flask debug mode (auto-reload)      | http://localhost:5000   |
| **adminer**  | Database 管理介面                    | http://localhost:8080   |
| **postgres** | PostgreSQL                          | localhost:5432          |
| **minio**    | MinIO Console                       | http://localhost:9001   |
| **crawler**  | Scrapy crawler (build from Dockerfile) | —                    |

**與 production 的差異：**
- frontend 使用 `node:20` 跑 Vite dev server，而非 Nginx 靜態檔
- backend 使用 Flask `--debug` 模式，而非 Gunicorn
- crawler volume mount 原始碼，改 spider 不需重建 image
- 移除 ngrok，新增 adminer

**需要手動重啟的情況：**
- 更新 `requirements.txt` → `docker compose -f docker-compose.dev.yml up -d --build backend`
- 更新 crawler 依賴 → `docker compose -f docker-compose.dev.yml build --no-cache crawler`
- 更新 `.env` → `docker compose -f docker-compose.dev.yml up -d`

## Useful Commands

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f [service]

# Rebuild a specific service
docker compose up --build -d [service]

# Remove all data (volumes)
docker compose down
rm -rf infra/postgres_data infra/minio_data
```
