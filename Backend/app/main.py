from typing import Annotated

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.api.v1 import admin, marketing
from app.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logger import get_logger
from app.core.rate_limit import limiter
from app.database.session import get_db

logger = get_logger(__name__)
app = FastAPI()

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

# Keeps every error response in the same {"message", "errors"} shape the
# frontend's ApiError class expects, see app/core/exceptions.py.
register_exception_handlers(app)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"message": "Too many requests, please try again later."},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(marketing.router)
app.include_router(admin.router)


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
