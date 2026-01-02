import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


def get_database_url() -> str:
    """Get database URL from environment, supporting both full URL and components."""
    if url := os.getenv("DATABASE_URL"):
        return url

    # AWS Secrets Manager injects these individually
    user = os.getenv("DB_USER", "chess")
    password = os.getenv("DB_PASSWORD", "chess")
    host = os.getenv("DB_HOST", "localhost")
    port = os.getenv("DB_PORT", "5432")
    dbname = os.getenv("DB_NAME", "chess")

    return f"postgresql://{user}:{password}@{host}:{port}/{dbname}"


DATABASE_URL = get_database_url()

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
