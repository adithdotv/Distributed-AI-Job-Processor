from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.batch import Batch
from app.models.job import Job
from app.schemas.batch import BatchCreate, BatchResponse
from fastapi import HTTPException
from app.schemas.job import JobResponse


router = APIRouter(
    prefix="/batches",
    tags=["Batches"],
)


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

    for job_data in batch_data.jobs:
        job = Job(
            batch_id=batch.id,
            input_data=job_data.input_data,
        )

        db.add(job)

    db.commit()
    db.refresh(batch)

    return batch


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

    return batch


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