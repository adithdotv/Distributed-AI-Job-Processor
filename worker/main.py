
import json
import uuid

import redis

from app.config import settings
from worker.processor import process_job
from worker.recovery import recover_expired_jobs
from app.services.queue_service import promote_due_retries


QUEUE_NAME = "jobs"
PROCESSING_QUEUE = "jobs:processing"
WORKER_ID = f"worker-{uuid.uuid4().hex[:8]}"

redis_client = redis.Redis.from_url(
    settings.redis_url,
    decode_responses=True,
    socket_timeout=None,
)


def start_worker():
    print("Worker started...")
    print(f"Worker ID: {WORKER_ID}")
    print(f"Listening on queue: {QUEUE_NAME}")

    while True:
        promote_due_retries()
        recover_expired_jobs(redis_client)

        payload = redis_client.blmove(
            QUEUE_NAME,
            PROCESSING_QUEUE,
            timeout=5,
            src="RIGHT",
            dest="LEFT",
        )

        if payload is None:
            continue

        try:
            message = json.loads(payload)
            job_id = int(message["job_id"])
        except (json.JSONDecodeError, TypeError, KeyError, ValueError):
            try:
                job_id = int(payload)
            except ValueError:
                print(f"Invalid queue payload: {payload}")
                redis_client.lrem(PROCESSING_QUEUE, 1, payload)
                continue

        print(f"Received Job {job_id}")

        try:
            process_job(job_id, WORKER_ID)
        except Exception as exc:
            print(
                f"Unexpected error processing Job {job_id}: {exc}. "
                "Entry remains in the processing queue."
            )
            raise
        else:
            redis_client.lrem(PROCESSING_QUEUE, 1, payload)
            print(f"Job {job_id} acknowledged")


if __name__ == "__main__":
    start_worker()
