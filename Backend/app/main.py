"""
Exofe Backend — FastAPI application entry point.
"""

from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api import v1
from app.core.logger import get_logger
from app.database.session import get_db

logger = get_logger(__name__)

app = FastAPI(title="Exofe API", version="1.0.0")


# ── Validation error handler ────────────────────────────────────────────────
# Converts FastAPI's default 422 shape into the
# { "message": "...", "errors": { "field": "msg" } } shape the frontend expects.

@app.exception_handler(RequestValidationError)
async def validation_error_handler(_request: Request, exc: RequestValidationError):
    errors: dict[str, str] = {}
    for error in exc.errors():
        # error["loc"] is a tuple like ("body", "firstName")
        field = error["loc"][-1] if error["loc"] else "unknown"
        errors[str(field)] = error["msg"]

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"message": "Please fix the errors below", "errors": errors},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1.router)

@app.get("/health")
def health_check(session: Annotated[Session, Depends(get_db)]):
    logger.info("Health check endpoint hit")
    try:
        session.execute(text("SELECT 1"))
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Database connection failed")
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="localhost", port=8000)