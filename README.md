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
