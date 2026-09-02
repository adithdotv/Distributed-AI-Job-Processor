from app.config import settings
from app.models.job import Job

from app.services.queue_service import enqueue_job
from worker.database import SessionLocal


def process_job(job_id: int):
    db = SessionLocal()

    try:
        job = db.get(Job, job_id)

        if not job:
            print(f"Job {job_id} not found")
            return

        if job.status in ("completed", "failed"):
            print(
                f"Job {job_id} already finished "
                f"with status={job.status}"
            )
            return

        job.status = "processing"
        job.attempts += 1

        db.commit()

        print(
            f"Processing Job {job_id} "
            f"(attempt {job.attempts})"
        )

        result = process_job_logic(job)

        job.status = "completed"
        job.result = result

        db.commit()

        print(f"Job {job_id} completed")

    except Exception as exc:
        db.rollback()

        job = db.get(Job, job_id)

        if not job:
            return

        print(
            f"Job {job_id} failed: {exc}"
        )

        if job.attempts < settings.max_job_attempts:
            job.status = "pending"

            db.commit()

            enqueue_job(job.id)

            print(
                f"Job {job_id} queued for retry"
            )

        else:
            job.status = "failed"

            db.commit()

            print(
                f"Job {job_id} permanently failed"
            )

    finally:
        db.close()


def process_job_logic(job: Job) -> str:
    import time

    time.sleep(3)

    return f"Processed: {job.input_data}"