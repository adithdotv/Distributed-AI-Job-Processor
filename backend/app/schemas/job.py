from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class JobCreate(BaseModel):
    input_data: str


class JobResponse(BaseModel):
    id: int
    batch_id: int
    status: str
    input_data: str
    result: Optional[str]
    attempts: int
    created_at: datetime

    class Config:
        from_attributes = True