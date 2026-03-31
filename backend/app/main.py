import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .routers import ml
from .services.claim_service import create_claims_for_trigger, get_supabase
from .trigger_config import TRIGGERS
from .trigger_engine import start_trigger_engine

logging.basicConfig(level=logging.INFO)


def _get_inserted_row(result):
    if isinstance(result.data, list):
        return result.data[0] if result.data else None
    return result.data


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = start_trigger_engine(app)
    app.state.scheduler = scheduler
    try:
        yield
    finally:
        scheduler.shutdown(wait=False)


app = FastAPI(
    title="GRIP ML API",
    version="0.1.0",
    description="Premium calculation endpoints for GRIP.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ml.router, prefix="/ml", tags=["ML"])


@app.post("/admin/fire-trigger")
async def fire_trigger(city: str, trigger_type: str, override_value: float):
    """
    Demo endpoint: manually inject a trigger reading.
    Sets the raw value directly and bypasses the scheduler.
    Used exclusively for demo video recording.
    """
    if trigger_type not in TRIGGERS:
        raise HTTPException(status_code=400, detail=f"Unknown trigger_type: {trigger_type}")

    supabase = get_supabase()
    event_data = {
        "trigger_type": trigger_type,
        "city": city,
        "raw_value": override_value,
        "threshold": TRIGGERS[trigger_type]["threshold"],
        "persistence_day": TRIGGERS[trigger_type]["persistence_days"],
        "confirmed": True,
        "data_source": "Manual",
        "quality_flag": "estimated",
        "metadata": {"demo_override": True, "override_value": override_value},
    }

    result = supabase.table("trigger_events").insert(event_data).execute()
    event = _get_inserted_row(result)

    if not event:
        raise HTTPException(status_code=500, detail="Trigger event insert returned no data")

    await create_claims_for_trigger(event)
    return {"status": "trigger_fired", "event": event}
