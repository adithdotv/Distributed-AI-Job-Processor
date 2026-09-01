from datetime import datetime

from pydantic import BaseModel


class BatchCreate(BaseModel):
    total_jobs: int


class BatchResponse(BaseModel):
    id: int
    status: str
    total_jobs: int
    completed_jobs: int
    failed_jobs: int
    created_at: datetime

    class Config:
        from_attributes = True