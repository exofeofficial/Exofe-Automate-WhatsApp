from typing import Annotated

from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.v1 import router as api_v1_router
from app.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logger import get_logger
from app.core.rate_limit import limiter
from app.database.session import get_db

logger = get_logger(__name__)

# Interactive API docs map out every endpoint and schema — handy in dev,
# needless attack-surface disclosure in prod, so turn them off there.
app = FastAPI(
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)


# Reject oversized request bodies before they're read into memory — the
# free tier only has ~512MB, so an unbounded upload/JSON body is an easy
# OOM. Applies to every route; the CSV import adds its own tighter cap.
MAX_BODY_BYTES = 8 * 1024 * 1024  # 8 MB


class MaxBodySizeMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        cl = request.headers.get("content-length")
        if cl is not None:
            try:
                if int(cl) > MAX_BODY_BYTES:
                    return JSONResponse(status_code=413, content={"message": "Request too large."})
            except ValueError:
                return JSONResponse(status_code=400, content={"message": "Invalid Content-Length."})
        return await call_next(request)


_SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        for k, v in _SECURITY_HEADERS.items():
            response.headers.setdefault(k, v)
        # HSTS only matters over HTTPS; safe to always send, browsers
        # ignore it on plain HTTP (local dev).
        if settings.is_production:
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
            )
        return response


app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(MaxBodySizeMiddleware)

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

app.include_router(api_v1_router)

@app.get("/")
def root():
    return {"message": "Welcome to the Exofe Automate WhatsApp API"}

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
