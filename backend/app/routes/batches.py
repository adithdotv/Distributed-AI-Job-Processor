from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.batch import Batch
from app.schemas.batch import BatchCreate, BatchResponse


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
        total_jobs=batch_data.total_jobs
    )

    db.add(batch)

    db.commit()

    db.refresh(batch)

    return batch