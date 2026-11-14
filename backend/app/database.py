"""
Engine e sessao SQLAlchemy do INVEST AI.
"""
import os
from urllib.parse import quote_plus

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# 1. Tenta pegar a URL do Render/Neon
DATABASE_URL = os.getenv("DATABASE_URL")

# 2. Se nao existir, monta a URL local
if not DATABASE_URL:
    from app.config import settings
    DATABASE_URL = (
        f"postgresql+psycopg2://{settings.DB_USER}:{quote_plus(settings.DB_PASSWORD)}"
        f"@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
    )

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()