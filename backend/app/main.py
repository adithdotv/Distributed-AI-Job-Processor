from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine
from app.models import Batch, Job
from app.redis_client import redis_client
from app.routes.batches import router as batches_router
from app.routes.jobs import router as jobs_router


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Distributed AI Job Processor",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health_check():
    try:
        redis_client.ping()
        redis_status = "connected"
    except Exception:
        redis_status = "disconnected"

    return {
        "status": "ok",
        "redis": redis_status,
    }


app.include_router(batches_router)
app.include_router(jobs_router)