from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from collections import Counter
from sqlalchemy import func

from app.database import get_db
from app.models.batch import Batch
from app.models.job import Job
from app.schemas.batch import BatchCreate, BatchResponse
from fastapi import HTTPException
from app.schemas.job import JobResponse
from app.services.queue_service import enqueue_job


router = APIRouter(
    prefix="/batches",
    tags=["Batches"],
)


def build_batch_summary(batch: Batch, db: Session) -> dict:
    rows = (
        db.query(Job.status, func.count(Job.id))
        .filter(Job.batch_id == batch.id)
        .group_by(Job.status)
        .all()
    )

    counts = Counter({
        status: count
        for status, count in rows
    })

    total = sum(counts.values())
    completed = counts["completed"]
    failed = counts["failed"]
    pending = counts["pending"]
    processing = counts["processing"]

    if completed + failed == total:
        if failed == 0:
            status = "completed"
        elif completed == 0:
            status = "failed"
        else:
            status = "completed_with_failures"
    elif processing > 0 or completed > 0 or failed > 0:
        status = "processing"
    else:
        status = "pending"

    return {
        "id": batch.id,
        "status": status,
        "total_jobs": total,
        "completed_jobs": completed,
        "failed_jobs": failed,
        "pending_jobs": pending,
        "processing_jobs": processing,
        "created_at": batch.created_at,
    }


@router.post(
    "",
    response_model=BatchResponse,
)
def create_batch(
    batch_data: BatchCreate,
    db: Session = Depends(get_db),
):
    batch = Batch(
        total_jobs=len(batch_data.jobs)
    )

    db.add(batch)
    db.flush()

    jobs = []

    for job_data in batch_data.jobs:
        job = Job(
            batch_id=batch.id,
            input_data=job_data.input_data,
        )

        db.add(job)
        jobs.append(job)

    db.commit()

    for job in jobs:
        db.refresh(job)
        enqueue_job(job.id)

    db.refresh(batch)

    return build_batch_summary(batch, db)

@router.get(
    "/{batch_id}",
    response_model=BatchResponse,
)
def get_batch(
    batch_id: int,
    db: Session = Depends(get_db),
):
    batch = db.get(Batch, batch_id)

    if not batch:
        raise HTTPException(
            status_code=404,
            detail="Batch not found",
        )

    return build_batch_summary(batch, db)


@router.get(
    "/{batch_id}/jobs",
    response_model=list[JobResponse],
)
def get_batch_jobs(
    batch_id: int,
    db: Session = Depends(get_db),
):
    batch = db.get(Batch, batch_id)

    if not batch:
        raise HTTPException(
            status_code=404,
            detail="Batch not found",
        )

    return batch.jobs