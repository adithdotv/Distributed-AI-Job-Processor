from datetime import datetime, timedelta, timezone
import threading
from sqlalchemy import update

from app.config import settings
from app.models.job import Job
from app.models.job_attempt import JobAttempt
from app.services.queue_service import schedule_retry

from worker.database import SessionLocal


LEASE_SECONDS = 120


def renew_lease(job_id: int, worker_id: str, stop_event):
    while not stop_event.wait(30):
        db = SessionLocal()

        try:
            new_expiry = datetime.now(timezone.utc) + timedelta(
                seconds=LEASE_SECONDS
            )

            result = db.execute(
                update(Job)
                .where(
                    Job.id == job_id,
                    Job.status == "processing",
                    Job.worker_id == worker_id,
                )
                .values(lease_expires_at=new_expiry)
            )

            db.commit()

            if result.rowcount != 1:
                print(
                    f"Worker {worker_id} could not renew "
                    f"the lease for Job {job_id}"
                )
                return

            print(f"Lease renewed for Job {job_id}")

        except Exception as exc:
            db.rollback()
            print(
                f"Lease renewal failed for Job {job_id}: {exc}"
            )

        finally:
            db.close()


def run_with_lease_renewal(job: Job, job_id: int, worker_id: str):
    stop_event = threading.Event()

    heartbeat = threading.Thread(
        target=renew_lease,
        args=(job_id, worker_id, stop_event),
        daemon=True,
    )

    heartbeat.start()

    try:
        return process_job_logic(job)
    finally:
        stop_event.set()
        heartbeat.join(timeout=2)




def process_job(job_id: int, worker_id: str):
    db = SessionLocal()
    retry_job = False
    attempt_id = None

    try:
        lease_expiry = datetime.now(timezone.utc) + timedelta(
            seconds=LEASE_SECONDS
        )

        claim = db.execute(
            update(Job)
            .where(
                Job.id == job_id,
                Job.status == "pending",
            )
            .values(
                status="processing",
                attempts=Job.attempts + 1,
                worker_id=worker_id,
                lease_expires_at=lease_expiry,
            )
            .returning(Job.attempts)
        )

        attempt_number = claim.scalar_one_or_none()

        if attempt_number is None:
            db.rollback()
            print(
                f"Job {job_id} was not claimed by {worker_id}; "
                "it may already be claimed or finished."
            )
            return

        job = db.get(Job, job_id)

        if job is None:
            db.rollback()
            print(f"Job {job_id} not found")
            return

        attempt = JobAttempt(
            job_id=job_id,
            attempt_number=attempt_number,
            status="processing",
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)
        attempt_id = attempt.id

        print(
            f"Worker {worker_id} processing Job {job_id} "
            f"(attempt {attempt_number})"
        )

        try:
            result = run_with_lease_renewal(job, job_id, worker_id)

        except Exception as exc:
            db.rollback()

            attempt = db.get(JobAttempt, attempt_id)
            if attempt is None:
                raise RuntimeError(
                    f"Could not reload attempt {attempt_id}"
                ) from exc

            next_status = (
                "pending"
                if attempt_number < settings.max_job_attempts
                else "failed"
            )

            # Only the worker that still owns the lease may
            # change the job state.
            ownership = db.execute(
                update(Job)
                .where(
                    Job.id == job_id,
                    Job.status == "processing",
                    Job.worker_id == worker_id,
                )
                .values(
                    status=next_status,
                    worker_id=None,
                    lease_expires_at=None,
                )
                .returning(Job.id)
            )

            owns_job = ownership.scalar_one_or_none() is not None

            attempt.status = "failed"
            attempt.error_message = (
                str(exc)
                if owns_job
                else "Worker lost job ownership before finalizing failure."
            )
            attempt.finished_at = datetime.now(timezone.utc)

            db.commit()

            if owns_job:
                retry_job = next_status == "pending"
                print(
                    f"Job {job_id} attempt {attempt_number} failed: {exc}"
                )
            else:
                print(
                    f"Worker {worker_id} lost ownership of Job {job_id}; "
                    "it did not change the job state."
                )

        else:
            # Finalize only if this worker still owns the job.
            ownership = db.execute(
                update(Job)
                .where(
                    Job.id == job_id,
                    Job.status == "processing",
                    Job.worker_id == worker_id,
                )
                .values(
                    result=result,
                    status="completed",
                    worker_id=None,
                    lease_expires_at=None,
                )
                .returning(Job.id)
            )

            owns_job = ownership.scalar_one_or_none() is not None

            attempt = db.get(JobAttempt, attempt_id)
            if attempt is None:
                raise RuntimeError(
                    f"Could not reload attempt {attempt_id}"
                )

            if owns_job:
                attempt.status = "completed"
                attempt.error_message = None
                print(f"Job {job_id} completed by {worker_id}")
            else:
                attempt.status = "failed"
                attempt.error_message = (
                    "Worker lost job ownership before finalizing success."
                )
                print(
                    f"Worker {worker_id} lost ownership of Job {job_id}; "
                    "its result was discarded."
                )

            attempt.finished_at = datetime.now(timezone.utc)
            db.commit()

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()

    if retry_job:
        delay_seconds = min(
            5 * (2 ** (attempt_number - 1)),
            30,
        )

        schedule_retry(job_id, delay_seconds)

        print(
            f"Job {job_id} scheduled for retry "
            f"in {delay_seconds} seconds"
        )


def process_job_logic(job: Job) -> str:
    from app.services.llm_service import generate_result

    return generate_result(job.input_data)
