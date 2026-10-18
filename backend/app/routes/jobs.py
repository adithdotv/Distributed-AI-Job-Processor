from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.job import Job
from app.schemas.job import JobResponse


router = APIRouter(
    prefix="/jobs",
    tags=["Jobs"],
)


@router.get(
    "",
    response_model=list[JobResponse],
)
def list_jobs(
    status: Optional[str] = None,
    batch_id: Optional[int] = None,
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    query = db.query(Job)

    if status:
        query = query.filter(Job.status == status)

    if batch_id is not None:
        query = query.filter(Job.batch_id == batch_id)

    return query.order_by(Job.id.desc()).limit(limit).all()
