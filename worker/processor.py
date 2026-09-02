import time

from app.models.job import Job

from worker.database import SessionLocal


def process_job(job_id: int):
    db = SessionLocal()

    try:
        job = db.get(Job, job_id)

        if not job:
            print(f"Job {job_id} not found")
            return

        print(f"Processing Job {job_id}")

        job.status = "processing"
        job.attempts += 1

        db.commit()

        # Simulate processing
        time.sleep(3)

        job.status = "completed"
        job.result = f"Processed: {job.input_data}"

        db.commit()

        print(f"Job {job_id} completed")

    except Exception as exc:
        db.rollback()

        print(f"Job {job_id} failed: {exc}")

    finally:
        db.close()