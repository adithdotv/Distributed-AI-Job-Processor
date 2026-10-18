# Distributed AI Job Processor

A backend system that accepts batches of text-processing jobs over a REST API, distributes them through Redis to background worker processes, and processes each one with the Google Gemini API. Results, attempt history and batch progress are stored in PostgreSQL.

I built it to practice backend and distributed-systems fundamentals: asynchronous processing, queue-based work distribution, retries with backoff, and recovery from worker crashes.

## Why background processing?

An LLM call can take seconds and can fail or be rate-limited. If the API did that work inside the HTTP request, clients would wait on slow calls and failures would be lost. This project instead:

- returns immediately after saving the jobs and queueing them,
- lets separate worker processes do the slow work, so throughput scales with the number of workers,
- retries failed jobs with a delay instead of failing on the first error,
- returns jobs to the queue when a worker dies mid-job.

## Key features

All of these are implemented in the code.

- **Batch submission.** `POST /batches` creates one batch with many jobs. Each job is saved in PostgreSQL and pushed onto a Redis queue.
- **Worker pool.** Workers are plain Python processes that block on the Redis queue. Several can run in parallel.
- **AI execution.** Each job's text is sent to Gemini using the model set in `GEMINI_MODEL`. The response is stored as the job result.
- **Atomic job claiming.** A worker takes a job with a conditional `UPDATE ... WHERE status = 'pending'`, so a duplicate queue message does not cause a job to be processed twice at the same time.
- **Retries with exponential backoff.** A failed job goes back to `pending` and is scheduled in a Redis sorted set. The delay is 5 s, 10 s, 20 s, capped at 30 s. After `MAX_JOB_ATTEMPTS` (default 3) the job is marked `failed`.
- **Attempt history.** Every attempt is recorded in the `job_attempts` table with its status, error message and timestamps.
- **Leases and recovery.** A claimed job holds a 120 s lease, renewed every 30 s by a heartbeat thread. A worker that stops renewing loses the lease, and any other worker can move the job back to the queue.
- **Reliable queue pattern.** Workers move messages from `jobs` to `jobs:processing` with `BLMOVE`, and remove them only after the job is handled.
- **Lost-ownership protection.** A worker only writes a job's result or failure if it still owns the lease. Otherwise its result is discarded.
- **Batch progress.** Batch status and per-status counts are computed from the job rows on each request.

## Architecture

```mermaid
flowchart LR
    Client([Client]) -->|POST /batches<br/>GET /batches/...| API[FastAPI API]
    API -->|insert batch and jobs| PG[(PostgreSQL)]
    API -->|LPUSH job message| Q[(Redis<br/>jobs)]

    Q -->|BLMOVE| W[Worker]
    W <-->|claim, lease, result,<br/>attempts| PG
    W -->|generate_content| G[Gemini API]
    W -->|failed attempt:<br/>ZADD with delay| D[(Redis<br/>jobs:delayed)]
    D -->|promote when due| Q
    W -->|in-flight messages| P[(Redis<br/>jobs:processing)]
    P -->|expired lease:<br/>re-enqueue| Q
```

| Component | Role |
|---|---|
| **FastAPI** | Validates requests, writes batches and jobs to PostgreSQL, enqueues jobs, and reports status. It does not call Gemini. |
| **PostgreSQL** | Durable source of truth for batches, jobs, results, leases and attempt history. |
| **Redis** | Work distribution only: the `jobs` list, the `jobs:processing` list, and the `jobs:delayed` sorted set. Queue contents are not the source of truth for job state. |
| **Worker** | Loops forever: promote due retries, recover expired jobs, take the next message, process it, acknowledge it. |

### Redis keys

| Key | Type | Purpose |
|---|---|---|
| `jobs` | list | Messages waiting to be processed (`{"job_id", "delivery_id"}` JSON) |
| `jobs:processing` | list | Messages a worker has taken and not yet acknowledged |
| `jobs:delayed` | sorted set | Job IDs waiting for their retry time (score = due timestamp) |

## Technology stack

| Technology | Purpose |
|---|---|
| Python 3.12 | Language (Docker image uses `python:3.12-slim`) |
| FastAPI + Uvicorn | REST API |
| PostgreSQL 16 | Durable storage |
| SQLAlchemy 2 + Psycopg 3 | ORM and database driver |
| Redis 7 | Queue, in-flight tracking, delayed retries |
| Google Gemini (`google-genai`) | AI job execution |
| Pydantic / pydantic-settings | Request validation and configuration |
| Docker Compose | Runs the whole stack |

## Prerequisites

- Docker Desktop (includes Docker Compose)
- A Google Gemini API key
- Git

## Getting started

### 1. Clone

```bash
git clone https://github.com/adithdotv/Distributed-AI-Job-Processor
cd "Distributed AI Job Processor"
```

### 2. Configure

Two untracked files are needed. See [`.env.example`](.env.example) for all variable names.

**Project-root `.env`.** Read by Docker Compose to set the PostgreSQL password:

```env
POSTGRES_PASSWORD=choose-a-password
```

**`backend/.env.docker`.** Passed to the API and worker containers:

```env
DATABASE_URL=postgresql+psycopg://job_processor:choose-a-password@postgres:5432/job_processor
REDIS_URL=redis://redis:6379/0
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.5-flash-lite
```

The password in `DATABASE_URL` must match `POSTGRES_PASSWORD`. Both files are gitignored. Never commit them.

> PostgreSQL only applies `POSTGRES_PASSWORD` the first time its data volume is created. Changing it later does not change the password in an existing volume.

### 3. Build and start

```bash
docker compose up -d --build
```

### 4. Check status and logs

```bash
docker compose ps
docker compose logs api --tail 50
docker compose logs worker -f
```

### 5. Try it

- Health check: <http://localhost:8000/health>
- Swagger UI: <http://localhost:8000/docs>

### Stop

```bash
docker compose stop      # stop, keep containers and data
docker compose down      # remove containers, keep the PostgreSQL volume
```

Do **not** add `-v` to `down`. That deletes the `postgres_data` volume and all your data.

### Run more workers

```bash
docker compose up -d --scale worker=3
```

## Environment variables

Read by the Python application (`backend/app/config.py`):

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | yes | none | SQLAlchemy URL, e.g. `postgresql+psycopg://user:pass@postgres:5432/db` |
| `REDIS_URL` | yes | none | Redis URL, e.g. `redis://redis:6379/0` |
| `GEMINI_API_KEY` | yes | none | Gemini API key |
| `GEMINI_MODEL` | no | `gemini-3.5-flash-lite` | Gemini model name |
| `MAX_JOB_ATTEMPTS` | no | `3` | Attempts before a job is marked `failed` |
| `CORS_ORIGINS` | no | `http://localhost:5173,http://localhost:8080` | Comma-separated browser origins allowed to call the API |

Read by Docker Compose only:

| Variable | Source | Description |
|---|---|---|
| `POSTGRES_PASSWORD` | root `.env` | Password for the PostgreSQL container |

The PostgreSQL user and database name (`job_processor`) are set in `docker-compose.yml`.

Where values come from:

| File | Read by |
|---|---|
| `.env` (project root) | Docker Compose (`${...}` substitution) |
| `backend/.env.docker` | API and worker containers (`env_file`) |
| `backend/.env` | Python, when run locally outside Docker |

Real environment variables take precedence over `backend/.env`.

## API

Base URL: `http://localhost:8000`. There is no authentication.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service and Redis connectivity |
| `GET` | `/batches?limit=50` | Most recent batches with progress counts (max 200) |
| `POST` | `/batches` | Create a batch of jobs and queue them |
| `GET` | `/batches/{batch_id}` | Batch status and progress counts |
| `GET` | `/batches/{batch_id}/jobs` | All jobs in the batch, with results |
| `GET` | `/jobs?status=&batch_id=&limit=100` | Most recent jobs, optionally filtered (max 500) |

### Create a batch

```bash
curl -X POST http://localhost:8000/batches \
  -H "Content-Type: application/json" \
  -d '{"jobs": [{"input_data": "Summarize: Redis is an in-memory data store."}, {"input_data": "Explain what a message queue is."}]}'
```

Response:

```json
{
  "id": 1,
  "status": "pending",
  "total_jobs": 2,
  "completed_jobs": 0,
  "failed_jobs": 0,
  "pending_jobs": 2,
  "processing_jobs": 0,
  "created_at": "2026-01-01T12:00:00Z"
}
```

(The status may already show `processing` if a worker was quick.)

### Check batch progress

```bash
curl http://localhost:8000/batches/1
```

Returns the same shape as above, recomputed from the current job rows.

### Get jobs and results

```bash
curl http://localhost:8000/batches/1/jobs
```

```json
[
  {
    "id": 1,
    "batch_id": 1,
    "status": "completed",
    "input_data": "Summarize: Redis is an in-memory data store.",
    "result": "...generated text...",
    "attempts": 1,
    "created_at": "2026-01-01T12:00:00Z",
    "updated_at": "2026-01-01T12:00:05Z"
  }
]
```

`result` is `null` until the job completes. Unknown batch IDs return `404` with `{"detail": "Batch not found"}`.

### Health

```bash
curl http://localhost:8000/health
```

```json
{"status": "ok", "redis": "connected"}
```

`redis` is `"disconnected"` if Redis cannot be pinged. The endpoint does not check PostgreSQL.

## Web dashboard

A React + Vite dashboard lives in [`frontend/`](frontend/). With Docker it is served at <http://localhost:8080>.

- **Overview:** job totals by status and recent batches, derived from the batch summaries.
- **Jobs:** searchable, filterable job list with a detail panel (input, result, attempts, timestamps).
- **Batches:** submit a batch, watch progress bars update, and open a batch to see its jobs.
- **Settings:** API connectivity check and base-URL override (stored in the browser).

The browser calls the API directly, so `VITE_API_BASE_URL` must be a URL the browser can reach (default `http://localhost:8000`), never the Docker-internal hostname `api`. It is baked in at build time (a build arg in `docker-compose.yml`).

Local development:

```bash
cd frontend
cp .env.example .env     # optional; the default is http://localhost:8000
npm install
npm run dev              # http://localhost:5173
```

The dashboard polls the API every few seconds while the tab is visible. Error messages from failed attempts are not shown because the API does not expose them yet.

## Job lifecycle

```mermaid
stateDiagram-v2
    [*] --> pending: POST /batches
    pending --> processing: worker claims job<br/>(attempts + 1, lease set)
    processing --> completed: Gemini result stored
    processing --> pending: attempt failed and<br/>attempts < max (delayed retry)
    processing --> failed: attempt failed and<br/>attempts = max
    processing --> pending: lease expired,<br/>recovered by a worker
    completed --> [*]
    failed --> [*]
```

1. **Submit.** The API inserts the batch and jobs (`pending`), commits, then pushes one message per job to the `jobs` Redis list.
2. **Take.** A worker atomically moves a message from `jobs` to `jobs:processing`.
3. **Claim.** The worker runs `UPDATE jobs SET status='processing', attempts=attempts+1, worker_id=..., lease_expires_at=... WHERE id=? AND status='pending'`. If no row matches, the job is already claimed or finished and the worker skips it. A `job_attempts` row is created.
4. **Process.** The worker calls Gemini while a background thread renews the lease every 30 s.
5. **Success.** If the worker still owns the job, it stores the result and sets `completed`.
6. **Failure.** The attempt is recorded as `failed` with the error message. If `attempts < MAX_JOB_ATTEMPTS`, the job returns to `pending` and is added to `jobs:delayed` with a 5 s, 10 s, 20 s (max 30 s) delay. Otherwise it becomes `failed`.
7. **Acknowledge.** After handling, the worker removes the message from `jobs:processing`.
8. **Retry promotion.** At the top of every loop iteration, each worker moves due entries from `jobs:delayed` to `jobs`.
9. **Recovery.** Each loop iteration, a worker scans `jobs:processing`. If a job is `processing` with an expired lease, it is reset to `pending` and re-enqueued. A `pending` job still listed there is also re-enqueued. Messages for finished jobs are removed.

### Batch status

Computed in `build_batch_summary` from job counts:

| Condition | Batch status |
|---|---|
| `completed + failed == total`, no failures | `completed` |
| `completed + failed == total`, all failed | `failed` |
| `completed + failed == total`, mixed | `completed_with_failures` |
| otherwise, any job processing, completed or failed | `processing` |
| otherwise | `pending` |

## Database and Redis

Tables are created at API startup with `Base.metadata.create_all`.

```mermaid
erDiagram
    batches ||--o{ jobs : contains
    jobs ||--o{ job_attempts : has

    batches {
        int id PK
        string status
        int total_jobs
        int completed_jobs
        int failed_jobs
        timestamptz created_at
        timestamptz updated_at
    }
    jobs {
        int id PK
        int batch_id FK
        string status
        string input_data
        string result
        int attempts
        string worker_id
        timestamptz lease_expires_at
        timestamptz created_at
        timestamptz updated_at
    }
    job_attempts {
        int id PK
        int job_id FK
        int attempt_number
        string status
        text error_message
        timestamptz started_at
        timestamptz finished_at
    }
```

- Job statuses: `pending`, `processing`, `completed`, `failed`.
- The batch API response is computed from `jobs`. The `status`, `completed_jobs` and `failed_jobs` columns on `batches` are not updated by the code.
- `job_attempts` is written by workers but has no API endpoint yet. Query it with SQL.
- There are **no migrations**. `create_all` only creates missing tables and does not alter existing ones, so schema changes need a manual migration or a fresh database.
- PostgreSQL data persists in the `postgres_data` Docker volume. Redis has no volume, so queue contents do not survive a Redis container being removed.

Inspect data:

```bash
docker compose exec postgres psql -U job_processor -d job_processor -c "SELECT id, status, attempts FROM jobs ORDER BY id DESC LIMIT 10;"
```

## Configuration and troubleshooting

Inside Docker, services reach each other by Compose service name: `postgres` and `redis`, not `localhost`. The ports `5432`, `6379` and `8000` are also published to the host.

| Symptom | Likely cause and fix |
|---|---|
| Container exits with a Pydantic "field required" error | A required variable is missing from `backend/.env.docker` |
| `POSTGRES_PASSWORD` error from Compose | The root `.env` file is missing or lacks that variable |
| `password authentication failed` | `DATABASE_URL` does not match the password the existing volume was created with |
| `/health` shows `"redis": "disconnected"` | Check `docker compose ps` and that `REDIS_URL` uses host `redis` |
| Jobs stay `pending` | No worker running (`docker compose logs worker`), or Redis is down |
| Jobs fail repeatedly | Read the error in `job_attempts.error_message`: usually an invalid API key, wrong model name, or rate limit |
| Worker restarts repeatedly | Unexpected exceptions stop the worker process; Compose restarts it. Check the logs. The job is recovered after its lease expires |

Never commit `.env`, `backend/.env` or `backend/.env.docker`. They are listed in `.gitignore`. If a key is ever exposed, rotate it.

### Running without Docker for the app

PostgreSQL and Redis can still run in Docker (`docker compose up -d postgres redis`). Create `backend/.env` with the same variables, using `localhost` as the host, then:

```bash
# API, from backend/
pip install -r requirements.txt
uvicorn app.main:app --reload

# Worker, from the project root (PowerShell: $env:PYTHONPATH = "backend")
PYTHONPATH=backend python -m worker.main
```

## Limitations and future improvements

**Current limitations**

- **At-least-once processing.** Duplicate deliveries are possible. The status-guarded claim prevents concurrent double processing, but a job can be retried or re-run after a crash. This is not exactly-once.
- **Enqueue after commit.** If the API crashes between committing jobs and pushing them to Redis, those jobs stay `pending` and nothing re-queues them.
- **No automated tests.**
- **No authentication or rate limiting.**
- **No migrations.** Tables come from `create_all`.
- **Redis has no persistent volume.** Unprocessed queue messages are lost if the Redis container is recreated.
- **No explicit timeout on Gemini calls** in the code. A hung call keeps its worker busy, and the lease keeps being renewed meanwhile.
- **Recovery scans the whole processing list** on every worker loop, which is fine at this scale but not for large queues.
- **No graceful worker shutdown.** In-flight jobs are recovered by lease expiry instead.
- **Verbose SQL logging.** The API engine uses `echo=True`.
- **Attempt history and per-job errors are not exposed via the API.**

**Possible future improvements**

- Automated tests (unit and integration)
- Alembic migrations
- Transactional outbox or a sweeper for jobs that were never enqueued
- Metrics and structured logging
- Authentication and rate limiting
- Graceful shutdown and Gemini call timeouts
- Dead-letter queue for permanently failed jobs
- Endpoint for attempt history

## Learning outcomes

- Designing an asynchronous job pipeline with an API, a queue and workers
- Using PostgreSQL as the source of truth and Redis for distribution
- The reliable-queue pattern with `BLMOVE` and an in-flight list
- Lease-based ownership with heartbeats, and fencing so stale workers cannot overwrite results
- Atomic state transitions with conditional `UPDATE ... RETURNING`
- Delayed retries with exponential backoff using a Redis sorted set and an atomic Lua script
- Reasoning about delivery guarantees and failure windows
- Containerizing a multi-service app with Docker Compose, healthchecks and environment-based configuration
- Keeping secrets out of source control and images
