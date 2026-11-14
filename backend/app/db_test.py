"""
Teste de conexao INVEST AI -> PostgreSQL.
Nao cria tabelas nem altera dados: apenas valida a conexao e lista a versao do servidor.
"""
import os
import sys

import psycopg2
from psycopg2 import OperationalError
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "invest_ai")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD")

if not DB_PASSWORD:
    print("ERRO: DB_PASSWORD nao definida no arquivo .env")
    sys.exit(1)

try:
    conn = psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        connect_timeout=5,
    )
    with conn.cursor() as cur:
        cur.execute("SELECT version();")
        versao = cur.fetchone()[0]
    conn.close()

    print("Conexao OK com o PostgreSQL.")
    print(f"Servidor: {versao}")

except OperationalError as e:
    print("Falha ao conectar no PostgreSQL:")
    print(e)
    sys.exit(1)