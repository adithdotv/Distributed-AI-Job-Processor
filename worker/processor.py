from datetime import datetime, timezone

from app.config import settings
from app.models.job import Job
from app.models.job_attempt import JobAttempt
from app.services.queue_service import enqueue_job

from worker.database import SessionLocal


def process_job(job_id: int):
    db = SessionLocal()
    retry_job = False

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

        # Start a new attempt.
        job.attempts += 1
        job.status = "processing"

        attempt = JobAttempt(
            job_id=job.id,
            attempt_number=job.attempts,
            status="processing",
        )

        db.add(attempt)

        # Persist the attempt before calling Gemini.
        db.commit()
        db.refresh(attempt)

        attempt_id = attempt.id

        print(
            f"Processing Job {job_id} "
            f"(attempt {attempt.attempt_number})"
        )

        # Run the existing Gemini processing logic.
        try:
            result = process_job_logic(job)

        except Exception as exc:
            # Discard any uncommitted changes from processing.
            db.rollback()

            job = db.get(Job, job_id)
            attempt = db.get(JobAttempt, attempt_id)

            if not job or not attempt:
                print(
                    f"Could not reload Job {job_id} "
                    "or its attempt after failure"
                )
                return

            attempt.status = "failed"
            attempt.error_message = str(exc)
            attempt.finished_at = datetime.now(timezone.utc)

            if job.attempts < settings.max_job_attempts:
                job.status = "pending"
                retry_job = True
            else:
                job.status = "failed"

            # Save failure history before scheduling a retry.
            db.commit()

            print(
                f"Job {job_id} attempt "
                f"{attempt.attempt_number} failed: {exc}"
            )

            if retry_job:
                print(f"Job {job_id} queued for retry")
            else:
                print(f"Job {job_id} permanently failed")

        else:
            # The AI processing succeeded.
            job.result = result
            job.status = "completed"

            attempt.status = "completed"
            attempt.finished_at = datetime.now(timezone.utc)
            attempt.error_message = None

            db.commit()

            print(f"Job {job_id} completed")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()

    # Queue only after the database transaction has committed.
    if retry_job:
        enqueue_job(job_id)


def process_job_logic(job: Job) -> str:
    from app.services.llm_service import generate_result

    return generate_result(job.input_data)