# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (all workspaces)
pnpm install

# Development (run concurrently with docker-compose up)
pnpm dev:api        # API server with hot reload
pnpm dev:worker     # Worker with hot reload
pnpm demo:frontend  # Demo frontend on port 5173

# Lint & format (root, uses Biome)
pnpm lint
pnpm format
pnpm format:check

# Per-app (run inside apps/api or apps/worker)
pnpm build          # Compile TypeScript
pnpm test           # Jest tests
pnpm test:watch     # Watch mode
pnpm test:cov       # Coverage
pnpm test:e2e       # E2E tests

# Prisma
npx prisma migrate dev    # Local migration
npx prisma migrate deploy # Production migration
npx prisma generate       # Regenerate client
```

## Architecture

This is a **pnpm monorepo** implementing async CSV import processing via a microservices architecture.

### Services

| App | Type | Port | Role |
|-----|------|------|------|
| `apps/api` | NestJS HTTP | 3000 | Accept uploads, return status |
| `apps/worker` | NestJS Kafka consumer | — | Process CSVs asynchronously |
| `apps/frontend` | Vanilla HTML/JS | 5173 | Demo UI |

### Shared Packages

- `packages/contracts` — Kafka message types (`ImportMessage`) and `ImportStatus` enum shared by both apps
- `packages/minio` — NestJS module wrapping `@aws-sdk/client-s3` for MinIO; exports `upload()` and `getStream()`
- `packages/utils` — Pino logger setup

### Data Flow

```
Client → POST /imports (CSV + x-consumer-id header)
  → API stores file in MinIO at imports/{consumerId}/{timestamp}.csv
  → API creates Import record (status: PENDING)
  → API publishes ImportMessage to Kafka topic "csv-imports"
    → Worker picks up message
    → Worker updates status: PROCESSING
    → Worker streams CSV from MinIO, parses line-by-line
    → Worker batch-inserts valid rows (500/batch) into ImportedRow
    → Worker batch-inserts errors into ImportError
    → Worker updates status: COMPLETED or FAILED
Client → GET /imports/:id      (poll status)
Client → GET /imports/:id/errors (paginated errors)
```

### Key Design Decisions

- **Tenant isolation**: All records keyed by `tenantId` (from `x-consumer-id` header). The API guard requires this header.
- **Dynamic schema**: CSV headers become columns on `ImportedRow` — no fixed column schema.
- **Stream processing**: Worker reads CSV as a stream line-by-line (memory efficient). Rows are batched 500 at a time for DB inserts.
- **Decoupled status**: API returns 202 immediately; clients poll for completion.

### Infrastructure (docker-compose)

- **PostgreSQL 16** — `localhost:5432`, db: `csv_import`, user/pass: `postgres/postgres`
- **Kafka** — `localhost:9092`, topic: `csv-imports`, groupId: `csv-import-worker`
- **MinIO** — `localhost:9000` (API), `localhost:9001` (Console), credentials: `minioadmin/minioadmin`, bucket: `csv-imports`
- **Zookeeper** — Kafka coordination (internal only)
- The `migrate` service runs `prisma migrate deploy` on startup before API/Worker start.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `KAFKA_BROKER` | `kafka:9092` | Kafka broker address |
| `MINIO_ENDPOINT` | `http://localhost:9000` | MinIO endpoint |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO access key |
| `MINIO_SECRET_KEY` | `minioadmin` | MinIO secret key |
| `MINIO_BUCKET` | `csv-imports` | MinIO bucket name |
| `PORT` | `3000` | API listening port |

### Linting

Biome 2.x is the primary linter/formatter (config: `biome.json`). It replaces ESLint + Prettier at the root level. Individual apps still have ESLint configs for NestJS compatibility.
