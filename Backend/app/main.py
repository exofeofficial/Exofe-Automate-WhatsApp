from fastapi import FastAPI, Depends, HTTPException
from app.core.logger import get_logger
from typing import Annotated
from app.database.session import get_db
from sqlalchemy import text
from sqlalchemy.orm import Session

logger = get_logger(__name__)
app = FastAPI()


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