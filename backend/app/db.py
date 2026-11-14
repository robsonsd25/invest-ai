"""
Modulo de conexao com PostgreSQL do INVEST AI.
Centraliza a leitura do .env e a criacao de conexoes.
"""
import os
from contextlib import contextmanager
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Carrega o .env da raiz do backend (pai da pasta app/)
_BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(_BACKEND_DIR / ".env")


def get_dsn() -> dict:
    """Monta os parametros de conexao a partir do .env."""
    dsn = {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": os.getenv("DB_PORT", "5432"),
        "dbname": os.getenv("DB_NAME", "invest_ai"),
        "user": os.getenv("DB_USER", "postgres"),
        "password": os.getenv("DB_PASSWORD"),
        "connect_timeout": 5,
    }
    if not dsn["password"]:
        raise RuntimeError(
            "DB_PASSWORD nao definida. Verifique o arquivo .env em "
            f"{_BACKEND_DIR / '.env'}"
        )
    return dsn


@contextmanager
def get_cursor(dict_cursor: bool = True):
    """
    Context manager que entrega um cursor e garante close.
    Use assim:
        with get_cursor() as cur:
            cur.execute("SELECT 1")
    """
    factory = RealDictCursor if dict_cursor else None
    conn = psycopg2.connect(**get_dsn(), cursor_factory=factory)
    try:
        yield conn.cursor()
    finally:
        conn.close()


def check_db() -> dict:
    """Verifica se o banco responde. Usado pelo /health."""
    with get_cursor() as cur:
        cur.execute("SELECT version() AS v, current_database() AS db;")
        row = cur.fetchone()
    return {"database": row["db"], "version": row["v"]}