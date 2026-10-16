import time
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



DELAYED_QUEUE = "jobs:delayed"


def schedule_retry(job_id: int, delay_seconds: int):
    """Schedule a pending job for a future retry."""
    redis_client.zadd(
        DELAYED_QUEUE,
        {str(job_id): time.time() + delay_seconds},
    )


def promote_due_retries(limit: int = 100):
    """Atomically move due retries into the normal queue."""
    script = """
    local ids = redis.call(
        'ZRANGEBYSCORE',
        KEYS[1],
        '-inf',
        ARGV[1],
        'LIMIT',
        0,
        ARGV[2]
    )

    for _, job_id in ipairs(ids) do
        if redis.call('ZREM', KEYS[1], job_id) == 1 then
            redis.call('LPUSH', KEYS[2], job_id)
        end
    end

    return ids
    """

    return redis_client.eval(
        script,
        2,
        DELAYED_QUEUE,
        QUEUE_NAME,
        time.time(),
        limit,
    )
