from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Batch(Base):
    __tablename__ = "batches"

    id: Mapped[int] = mapped_column(primary_key=True)

    status: Mapped[str] = mapped_column(
        String(50),
        default="pending",
        nullable=False,
    )

    total_jobs: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    completed_jobs: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    failed_jobs: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    jobs: Mapped[list["Job"]] = relationship(
        back_populates="batch"
    )