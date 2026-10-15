
import json
import uuid

from app.redis_client import redis_client

QUEUE_NAME = "jobs"


def enqueue_job(job_id: int):
    payload = json.dumps({
        "job_id": job_id,
        "delivery_id": uuid.uuid4().hex,
    })

    redis_client.lpush(QUEUE_NAME, payload)
