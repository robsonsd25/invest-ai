"""
Aplica o schema inicial do INVEST AI no PostgreSQL.
Idempotente: pode ser executado varias vezes sem duplicar tabelas.
Transacional: se algo falhar, faz rollback e nao deixa o banco pela metade.
"""
import os
import sys
from pathlib import Path

import psycopg2
from psycopg2 import OperationalError, ProgrammingError
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
SCHEMA_FILE = BASE_DIR / "schema.sql"

if not SCHEMA_FILE.exists():
    print(f"ERRO: arquivo nao encontrado: {SCHEMA_FILE}")
    sys.exit(1)

try:
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "invest_ai"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD"),
        connect_timeout=5,
    )
    conn.autocommit = False

    with conn.cursor() as cur:
        sql = SCHEMA_FILE.read_text(encoding="utf-8-sig")
        cur.execute(sql)

    conn.commit()
    print("Schema aplicado com sucesso.")
    print(f"Arquivo: {SCHEMA_FILE}")

except (OperationalError, ProgrammingError) as e:
    conn.rollback()
    print("Falha ao aplicar o schema. Nada foi gravado.")
    print(e)
    sys.exit(1)
finally:
    conn.close()