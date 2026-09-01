from app.redis_client import redis_client


QUEUE_NAME = "jobs"


def enqueue_job(job_id: int):
    redis_client.lpush(
        QUEUE_NAME,
        job_id,
    )