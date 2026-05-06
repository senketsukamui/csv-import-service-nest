# CSV Import Service

Async CSV import pipeline built with NestJS, Kafka, MinIO, and PostgreSQL. Upload a file via REST, get an ID back immediately, and poll for status while the worker processes rows in the background.

## How it works

```
Client
  │
  ├─ POST /imports  (CSV file + x-consumer-id header)
  │      │
  │   API stores file → MinIO
  │   API creates Import record (PENDING)
  │   API publishes message → Kafka
  │
  └─ GET /imports/:id  (poll)
         │
      Worker (Kafka consumer)
         │
         ├─ streams CSV from MinIO
         ├─ parses line-by-line, validates columns
         ├─ batch-inserts rows (500/batch) → PostgreSQL
         └─ updates status: COMPLETED | FAILED
```

All data is scoped to a tenant via the `x-consumer-id` request header. The API always returns `202 Accepted` on upload — processing is fully async.

## Stack

| Layer | Technology |
|-------|-----------|
| API | NestJS 11, Express |
| Worker | NestJS 11, KafkaJS |
| Database | PostgreSQL 16 + Prisma |
| Message queue | Apache Kafka |
| Object storage | MinIO (S3-compatible) |
| Monorepo | pnpm workspaces |
| Linter/formatter | Biome |

## Quick start

Requires: Docker, Node.js 22, pnpm.

```bash
# 1. Start infrastructure
docker-compose up -d postgres kafka minio minio-init

# 2. Install dependencies
pnpm install

# 3. Run migrations and generate Prisma client
npx prisma migrate deploy
npx prisma generate

# 4. Start services (each in its own terminal)
pnpm dev:api        # http://localhost:3000
pnpm dev:worker

# 5. Open the demo UI
pnpm demo:frontend  # http://localhost:5173
```

Or start everything with Docker:

```bash
docker-compose up --build
```

## API

All endpoints require the `x-consumer-id` header.

### Upload a CSV

```
POST /imports
Content-Type: multipart/form-data
x-consumer-id: <tenant-id>

file: <csv file>
```

Response `202 Accepted`:
```json
{ "importId": "uuid" }
```

### Get import status

```
GET /imports/:id
x-consumer-id: <tenant-id>
```

```json
{
  "id": "uuid",
  "status": "COMPLETED",
  "fileName": "data.csv",
  "processedRows": 1000,
  "importedCount": 998,
  "errorCount": 2,
  "createdAt": "...",
  "finishedAt": "..."
}
```

Status values: `PENDING` → `PROCESSING` → `COMPLETED` | `FAILED`

### Get validation errors

```
GET /imports/:id/errors?page=1&limit=50
x-consumer-id: <tenant-id>
```

### Swagger docs

Available at `http://localhost:3000/api` when the API is running.

## Project structure

```
apps/
  api/        NestJS HTTP service (upload, status endpoints)
  worker/     NestJS Kafka consumer (CSV processing)
  frontend/   Demo UI (vanilla HTML/JS)
packages/
  contracts/  Shared Kafka message types and enums
  minio/      NestJS MinIO module (upload, getStream)
  utils/      Shared logger
prisma/       Database schema and migrations
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | — | PostgreSQL connection string |
| `KAFKA_BROKER` | `kafka:9092` | Kafka broker address |
| `MINIO_ENDPOINT` | `http://localhost:9000` | MinIO endpoint |
| `MINIO_ACCESS_KEY` | `minioadmin` | MinIO access key |
| `MINIO_SECRET_KEY` | `minioadmin` | MinIO secret key |
| `MINIO_BUCKET` | `csv-imports` | MinIO bucket name |
| `PORT` | `3000` | API port |

For local development outside Docker, set `KAFKA_BROKER=localhost:9092` and `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/csv_import`.

## Development

```bash
pnpm lint           # Biome lint
pnpm format         # Biome format (writes)
pnpm format:check   # Biome format (check only, used in CI)

# Inside apps/api or apps/worker:
pnpm test           # Jest
pnpm test:watch
pnpm test:cov
```

CI runs on every push and pull request — see `.github/workflows/ci.yml`.
