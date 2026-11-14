"""
Engine e sessao SQLAlchemy do INVEST AI.
Centraliza a conexao e o ciclo de vida das sessoes.
"""
from collections.abc import Generator
from urllib.parse import quote_plus

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

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


def get_db() -> Generator[Session, None, None]:
    """Dependencia do FastAPI: entrega uma sessao e fecha ao final."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()