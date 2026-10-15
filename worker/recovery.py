
import json
from datetime import datetime, timezone

from sqlalchemy import update

from app.models.job import Job
from app.services.queue_service import enqueue_job
from worker.database import SessionLocal

PROCESSING_QUEUE = "jobs:processing"


def recover_expired_jobs(redis_client):
    db = SessionLocal()

    try:
        payloads = redis_client.lrange(PROCESSING_QUEUE, 0, -1)
        now = datetime.now(timezone.utc)

        for payload in payloads:
            try:
                message = json.loads(payload)
                job_id = int(message["job_id"])
            except (json.JSONDecodeError, TypeError, KeyError, ValueError):
                try:
                    job_id = int(payload)
                except ValueError:
                    print(f"Invalid processing payload: {payload}")
                    continue

            job = db.get(Job, job_id)

            if job is None:
                redis_client.lrem(PROCESSING_QUEUE, 1, payload)
                continue

            should_requeue = False

            if job.status == "processing" and (
                job.lease_expires_at is not None
                and job.lease_expires_at <= now
            ):
                reclaimed = db.execute(
                    update(Job)
                    .where(
                        Job.id == job_id,
                        Job.status == "processing",
                        Job.lease_expires_at <= now,
                    )
                    .values(
                        status="pending",
                        worker_id=None,
                        lease_expires_at=None,
                    )
                )

                if reclaimed.rowcount == 1:
                    db.commit()
                    should_requeue = True
                else:
                    db.rollback()

            elif job.status == "pending":
                # Covers a crash after resetting the DB state
                # but before the job was enqueued again.
                should_requeue = True

            elif job.status in ("completed", "failed"):
                redis_client.lrem(PROCESSING_QUEUE, 1, payload)

            if should_requeue:
                enqueue_job(job_id)
                redis_client.lrem(PROCESSING_QUEUE, 1, payload)
                print(f"Recovered Job {job_id}")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()
