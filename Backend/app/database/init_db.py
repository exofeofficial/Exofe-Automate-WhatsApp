import time
from sqlalchemy import create_engine, text
from app.config import settings
from app.core.logger import get_logger

logger = get_logger(__name__)

def run_schema():
    attempts, max_attempts, wait_seconds = 0, 30, 2
    engine = None
    while True:
        try:
            logger.info(f"Connecting to Database")
            engine = create_engine(settings.database_url, pool_pre_ping=True)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            break
        except Exception as e:
            attempts += 1
            if attempts >= max_attempts:
                logger.error(f"Could not connect after {attempts} attempts: {e}")
                raise
            logger.info(f"DB not ready, retrying in {wait_seconds}s...")
            time.sleep(wait_seconds)

    logger.info("Running product_schema_patch.sql...")
    with open("app/database/product_schema_patch.sql", "r", encoding="utf-8") as f:
        sql = f.read()
    with engine.begin() as conn:
        conn.execute(text(sql))
    logger.info("Database initialized successfully!")

if __name__ == "__main__":
    run_schema()