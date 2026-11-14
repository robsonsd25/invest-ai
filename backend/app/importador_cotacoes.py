"""
Importador de cotacoes historicas do INVEST AI.
Fonte: Yahoo Finance (yfinance) - uso para desenvolvimento e simulacao.
Popula a tabela 'cotacoes' com dados OHLCV diarios.

Uso:
    python app\\importador_cotacoes.py
    python app\\importador_cotacoes.py --periodo 6mo
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import argparse  # noqa: E402
from datetime import datetime  # noqa: E402
from decimal import Decimal  # noqa: E402

import yfinance as yf  # noqa: E402
from sqlalchemy import select  # noqa: E402
from sqlalchemy.dialects.postgresql import insert  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.models import Ativo, Cotacao, Mercado  # noqa: E402


def _yf_ticker(ativo: Ativo, mercado_codigo: str) -> str:
    """
    Monta o ticker no formato do Yahoo Finance.
    - B3: sufixo .SA (ex.: PETR4 -> PETR4.SA)
    - US: sem sufixo (ex.: AAPL -> AAPL)
    """
    if mercado_codigo == "B3":
        return f"{ativo.ticker}.SA"
    return ativo.ticker


def _importar_ativo(
    db: Session, ativo: Ativo, mercado_codigo: str, periodo: str
) -> int:
    ticker_yf = _yf_ticker(ativo, mercado_codigo)
    print(f"  Baixando {ativo.ticker} ({ticker_yf}) ...", end=" ", flush=True)

    try:
        df = yf.download(ticker_yf, period=periodo, interval="1d", progress=False, auto_adjust=True)
    except Exception as e:
        print(f"ERRO: {e}")
        return 0

    if df.empty:
        print("sem dados (ticker invalido ou sem historico).")
        return 0

    # yfinance pode retornar MultiIndex em algumas versoes; achatamos.
    if hasattr(df.columns, "nlevels") and df.columns.nlevels > 1:
        df.columns = df.columns.get_level_values(0)

    registros = []
    for data_idx, row in df.iterrows():
        if row.get("Close") is None:
            continue

        # Converte Timestamp -> date
        data_dt = data_idx.date() if hasattr(data_idx, "date") else data_idx

        registros.append({
            "ativo_id": ativo.id,
            "data": data_dt,
            "abertura": Decimal(str(round(float(row["Open"]), 6))) if row.get("Open") is not None else None,
            "maxima": Decimal(str(round(float(row["High"]), 6))) if row.get("High") is not None else None,
            "minima": Decimal(str(round(float(row["Low"]), 6))) if row.get("Low") is not None else None,
            "fechamento": Decimal(str(round(float(row["Close"]), 6))) if row.get("Close") is not None else None,
            "volume": int(row["Volume"]) if row.get("Volume") is not None else None,
            "fonte": "yfinance",
        })

    if not registros:
        print("sem linhas validas.")
        return 0

    # Insercao idempotente: ON CONFLICT (ativo_id, data) DO NOTHING
    stmt = insert(Cotacao).values(registros)
    stmt = stmt.on_conflict_do_nothing(index_elements=["ativo_id", "data"])
    result = db.execute(stmt)
    db.commit()
    inseridos = result.rowcount if result.rowcount and result.rowcount > 0 else 0
    print(f"{inseridos} novas cotacoes (de {len(registros)} linhas).")
    return inseridos


def run(periodo: str = "1y", mercado_filtro: str | None = None) -> None:
    db = SessionLocal()
    try:
        stmt = select(Ativo, Mercado.codigo).join(Mercado, Ativo.mercado_id == Mercado.id).where(Ativo.ativo.is_(True))
        if mercado_filtro:
            stmt = stmt.where(Mercado.codigo == mercado_filtro.upper())

        pares = db.execute(stmt).all()
        if not pares:
            print("Nenhum ativo encontrado com os filtros aplicados.")
            return

        print(f"Importando cotacoes para {len(pares)} ativo(s), periodo={periodo}")
        total = 0
        for ativo, mercado_codigo in pares:
            total += _importar_ativo(db, ativo, mercado_codigo, periodo)

        print(f"\nImportacao concluida. Total de novas cotacoes: {total}")

        # Sumarizacao
        total_banco = db.scalar(select(Cotacao.id).limit(1)) is not None
        if total_banco:
            from sqlalchemy import func
            n = db.scalar(select(func.count()).select_from(Cotacao))
            print(f"Total de cotacoes no banco agora: {n}")

    except Exception as e:
        db.rollback()
        print(f"Falha na importacao: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Importador de cotacoes INVEST AI (yfinance)")
    parser.add_argument("--periodo", default="1y", help="Periodo no formato yfinance: 1mo, 3mo, 6mo, 1y, 2y, 5y, max (padrao: 1y)")
    parser.add_argument("--mercado", default=None, help="Filtra por mercado: B3, NYSE, NASDAQ (padrao: todos)")
    args = parser.parse_args()
    run(periodo=args.periodo, mercado_filtro=args.mercado)