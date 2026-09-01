from fastapi import FastAPI

from app.database import Base, engine
from app.models import Batch, Job
from app.routes.batches import router as batches_router


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Distributed AI Job Processor",
    version="1.0.0",
)


@app.get("/health")
def health_check():
    return {
        "status": "ok"
    }


app.include_router(batches_router)