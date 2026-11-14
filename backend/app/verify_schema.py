"""
Lista tabelas, contagens e seeds do schema do INVEST AI.
Somente leitura - nao altera nada.
"""
import os
import sys

import psycopg2
from psycopg2 import OperationalError
from dotenv import load_dotenv

load_dotenv()

TABELAS = [
    "mercados", "tipos_ativo", "perfis_risco",
    "ativos", "cotacoes",
    "fontes", "noticias",
    "carteiras", "operacoes_simuladas",
    "analises", "limites_risco",
]

try:
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME", "invest_ai"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD"),
        connect_timeout=5,
    )
    with conn.cursor() as cur:
        print(f"{'Tabela':<25} {'Linhas':>8}")
        print("-" * 35)
        for t in TABELAS:
            try:
                cur.execute(f"SELECT COUNT(*) FROM {t};")
                print(f"{t:<25} {cur.fetchone()[0]:>8}")
            except Exception:
                print(f"{t:<25} {'AUSENTE':>8}")

        print("\nPerfis de risco cadastrados:")
        cur.execute(
            "SELECT codigo, nome, capital_inicial_brl, "
            "max_perda_diaria_pct, max_drawdown_pct, max_exposicao_pct "
            "FROM perfis_risco ORDER BY id;"
        )
        for cod, nome, cap, pdi, dd, exp in cur.fetchall():
            print(f"  {cod:<12} {nome:<12} R$ {cap:>8}  "
                  f"perda_dia {pdi}%  drawdown {dd}%  exp {exp}%")
    conn.close()
except OperationalError as e:
    print("Falha ao conectar:")
    print(e)
    sys.exit(1)