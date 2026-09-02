import redis

from app.config import settings

from worker.processor import process_job


QUEUE_NAME = "jobs"


redis_client = redis.Redis.from_url(
    settings.redis_url,
    decode_responses=True,
    socket_timeout=None,
)


def start_worker():
    print("Worker started...")
    print(f"Listening on queue: {QUEUE_NAME}")

    while True:
        result = redis_client.brpop(
            QUEUE_NAME,
            timeout=0,
        )

        if result is None:
            continue

        _, job_id = result

        print(f"Received Job {job_id}")

        process_job(int(job_id))


if __name__ == "__main__":
    start_worker()