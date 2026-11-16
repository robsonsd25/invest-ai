"""
Popula uma organizacao do SaaS INVEST AI com dados iniciais.
Inclui: referencia global (mercados, tipos, perfis), ativos, cotacoes e noticias.

Uso:
    python app/populate_org.py --org-id 1
    python app/populate_org.py --org-id 1 --skip-cotacoes --skip-noticias
"""
import sys
import argparse
from datetime import datetime
from decimal import Decimal
from email.utils import parsedate_to_datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import feedparser  # noqa: E402
import yfinance as yf  # noqa: E402
from sqlalchemy import select  # noqa: E402
from sqlalchemy.dialects.postgresql import insert as pg_insert  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.models import (  # noqa: E402
    Ativo, Cotacao, Fonte, Mercado, Noticia, PerfilRisco, TipoAtivo
)

# ==========================================
# REFERENCIA GLOBAL
# ==========================================
MERCADOS = [
    {"codigo": "B3", "nome": "B3 - Brasil Bolsa Balcao", "pais": "BR", "moeda": "BRL", "fuso_horario": "America/Sao_Paulo"},
    {"codigo": "NYSE", "nome": "New York Stock Exchange", "pais": "US", "moeda": "USD", "fuso_horario": "America/New_York"},
    {"codigo": "NASDAQ", "nome": "NASDAQ", "pais": "US", "moeda": "USD", "fuso_horario": "America/New_York"},
    {"codigo": "CRYPTO", "nome": "Criptomoedas", "pais": "US", "moeda": "USD", "fuso_horario": "UTC"},
]

TIPOS_ATIVO = [
    {"codigo": "ACAO", "nome": "Acao"},
    {"codigo": "FII", "nome": "Fundo de Investimento Imobiliario"},
    {"codigo": "ETF", "nome": "Exchange Traded Fund"},
    {"codigo": "BDR", "nome": "Brazilian Depositary Receipt"},
    {"codigo": "CRIPTO", "nome": "Criptomoeda"},
]

PERFIS_RISCO = [
    {"codigo": "CONSERVADOR", "nome": "Conservador", "descricao": "Prioridade a preservacao de capital.",
     "capital_inicial_brl": Decimal("5000.00"), "max_perda_diaria_pct": Decimal("1.00"),
     "max_drawdown_pct": Decimal("5.00"), "max_exposicao_pct": Decimal("40.00")},
    {"codigo": "MODERADO", "nome": "Moderado", "descricao": "Equilibrio entre risco e retorno.",
     "capital_inicial_brl": Decimal("5000.00"), "max_perda_diaria_pct": Decimal("2.00"),
     "max_drawdown_pct": Decimal("10.00"), "max_exposicao_pct": Decimal("60.00")},
    {"codigo": "AGRESSIVO", "nome": "Agressivo", "descricao": "Maior tolerancia a volatilidade.",
     "capital_inicial_brl": Decimal("5000.00"), "max_perda_diaria_pct": Decimal("3.00"),
     "max_drawdown_pct": Decimal("20.00"), "max_exposicao_pct": Decimal("80.00")},
]

# LISTA EXPANDIDA COM CRIPTOMOEDAS
ATIVOS = [
    # --- B3 (15 ativos) ---
    {"ticker": "PETR4", "nome": "Petroleo Brasileiro S.A. - Petrobras PN", "mercado": "B3", "tipo": "ACAO", "setor": "Petroleo e Gas"},
    {"ticker": "VALE3", "nome": "Vale S.A. ON", "mercado": "B3", "tipo": "ACAO", "setor": "Mineracao"},
    {"ticker": "ITUB4", "nome": "Itau Unibanco Holding S.A. PN", "mercado": "B3", "tipo": "ACAO", "setor": "Bancos"},
    {"ticker": "BBAS3", "nome": "Banco do Brasil S.A. ON", "mercado": "B3", "tipo": "ACAO", "setor": "Bancos"},
    {"ticker": "BBDC4", "nome": "Banco Bradesco S.A. PN", "mercado": "B3", "tipo": "ACAO", "setor": "Bancos"},
    {"ticker": "ABEV3", "nome": "Ambev S.A. ON", "mercado": "B3", "tipo": "ACAO", "setor": "Bebidas"},
    {"ticker": "WEGE3", "nome": "WEG S.A. ON", "mercado": "B3", "tipo": "ACAO", "setor": "Bens Industriais"},
    {"ticker": "RENT3", "nome": "Localiza Rent a Car S.A. ON", "mercado": "B3", "tipo": "ACAO", "setor": "Aluguel de Carros"},
    {"ticker": "SUZB3", "nome": "Suzano S.A. ON", "mercado": "B3", "tipo": "ACAO", "setor": "Papel e Celulose"},
    {"ticker": "ELET3", "nome": "Centrais Eletricas Brasileiras S.A. ON", "mercado": "B3", "tipo": "ACAO", "setor": "Energia Eletrica"},
    {"ticker": "GGBR4", "nome": "Gerdau S.A. PN", "mercado": "B3", "tipo": "ACAO", "setor": "Siderurgia"},
    {"ticker": "PRIO3", "nome": "PetroRio S.A. ON", "mercado": "B3", "tipo": "ACAO", "setor": "Petroleo e Gas"},
    {"ticker": "EQTL3", "nome": "Equatorial Energia S.A. ON", "mercado": "B3", "tipo": "ACAO", "setor": "Energia Eletrica"},
    {"ticker": "VIVT3", "nome": "Telefonica Brasil S.A. ON", "mercado": "B3", "tipo": "ACAO", "setor": "Telecomunicacoes"},
    {"ticker": "TOTS3", "nome": "Totvs S.A. ON", "mercado": "B3", "tipo": "ACAO", "setor": "Tecnologia"},
    
    # --- NASDAQ (9 ativos) ---
    {"ticker": "AAPL", "nome": "Apple Inc.", "mercado": "NASDAQ", "tipo": "ACAO", "setor": "Tecnologia"},
    {"ticker": "MSFT", "nome": "Microsoft Corporation", "mercado": "NASDAQ", "tipo": "ACAO", "setor": "Tecnologia"},
    {"ticker": "NVDA", "nome": "NVIDIA Corporation", "mercado": "NASDAQ", "tipo": "ACAO", "setor": "Semicondutores"},
    {"ticker": "AMZN", "nome": "Amazon.com Inc.", "mercado": "NASDAQ", "tipo": "ACAO", "setor": "Varejo"},
    {"ticker": "GOOGL", "nome": "Alphabet Inc. Class A", "mercado": "NASDAQ", "tipo": "ACAO", "setor": "Tecnologia"},
    {"ticker": "META", "nome": "Meta Platforms Inc.", "mercado": "NASDAQ", "tipo": "ACAO", "setor": "Tecnologia"},
    {"ticker": "TSLA", "nome": "Tesla Inc.", "mercado": "NASDAQ", "tipo": "ACAO", "setor": "Automotivo"},
    {"ticker": "AVGO", "nome": "Broadcom Inc.", "mercado": "NASDAQ", "tipo": "ACAO", "setor": "Semicondutores"},
    {"ticker": "COST", "nome": "Costco Wholesale Corporation", "mercado": "NASDAQ", "tipo": "ACAO", "setor": "Varejo"},
    
    # --- NYSE (6 ativos) ---
    {"ticker": "JPM", "nome": "JPMorgan Chase & Co.", "mercado": "NYSE", "tipo": "ACAO", "setor": "Bancos"},
    {"ticker": "XOM", "nome": "Exxon Mobil Corporation", "mercado": "NYSE", "tipo": "ACAO", "setor": "Petroleo e Gas"},
    {"ticker": "NFLX", "nome": "Netflix Inc.", "mercado": "NYSE", "tipo": "ACAO", "setor": "Entretenimento"},
    {"ticker": "AMD", "nome": "Advanced Micro Devices Inc.", "mercado": "NYSE", "tipo": "ACAO", "setor": "Semicondutores"},
    {"ticker": "INTC", "nome": "Intel Corporation", "mercado": "NYSE", "tipo": "ACAO", "setor": "Semicondutores"},
    {"ticker": "KO", "nome": "The Coca-Cola Company", "mercado": "NYSE", "tipo": "ACAO", "setor": "Bebidas"},

    # --- CRYPTO (6 ativos) ---
    {"ticker": "BTC-USD", "nome": "Bitcoin", "mercado": "CRYPTO", "tipo": "CRIPTO", "setor": "Criptomoeda"},
    {"ticker": "ETH-USD", "nome": "Ethereum", "mercado": "CRYPTO", "tipo": "CRIPTO", "setor": "Criptomoeda"},
    {"ticker": "SOL-USD", "nome": "Solana", "mercado": "CRYPTO", "tipo": "CRIPTO", "setor": "Criptomoeda"},
    {"ticker": "ADA-USD", "nome": "Cardano", "mercado": "CRYPTO", "tipo": "CRIPTO", "setor": "Criptomoeda"},
    {"ticker": "XRP-USD", "nome": "XRP", "mercado": "CRYPTO", "tipo": "CRIPTO", "setor": "Criptomoeda"},
    {"ticker": "DOGE-USD", "nome": "Dogecoin", "mercado": "CRYPTO", "tipo": "CRIPTO", "setor": "Criptomoeda"},
]


def _seed_referencia(db) -> None:
    for m in MERCADOS:
        if not db.scalar(select(Mercado).where(Mercado.codigo == m["codigo"])):
            db.add(Mercado(**m))
    for t in TIPOS_ATIVO:
        if not db.scalar(select(TipoAtivo).where(TipoAtivo.codigo == t["codigo"])):
            db.add(TipoAtivo(**t))
    for p in PERFIS_RISCO:
        if not db.scalar(select(PerfilRisco).where(PerfilRisco.codigo == p["codigo"])):
            db.add(PerfilRisco(**p))
    db.flush()
    print("  Referencia global: OK")


def _seed_ativos(db, org_id: int) -> list[Ativo]:
    mercados = {m.codigo: m.id for m in db.scalars(select(Mercado)).all()}
    tipos = {t.codigo: t.id for t in db.scalars(select(TipoAtivo)).all()}

    inseridos = []
    for a in ATIVOS:
        mercado_id = mercados.get(a["mercado"])
        tipo_id = tipos.get(a["tipo"])
        if not mercado_id or not tipo_id:
            continue
        existente = db.scalar(
            select(Ativo).where(Ativo.ticker == a["ticker"], Ativo.organizacao_id == org_id)
        )
        if not existente:
            novo = Ativo(
                organizacao_id=org_id, ticker=a["ticker"], nome=a["nome"],
                mercado_id=mercado_id, tipo_id=tipo_id, setor=a["setor"],
            )
            db.add(novo)
            db.flush()
            inseridos.append(novo)
        else:
            inseridos.append(existente)
    print(f"  Ativos: {len(inseridos)} prontos")
    return inseridos


def _yf_ticker(ticker: str, mercado_codigo: str) -> str:
    """
    Ajusta o ticker para o formato do Yahoo Finance.
    - B3: sufixo .SA (ex.: PETR4 -> PETR4.SA)
    - CRYPTO: mantém o formato (ex.: BTC-USD)
    - US: sem sufixo
    """
    if mercado_codigo == "B3":
        return f"{ticker}.SA"
    return ticker  # CRYPTO e US já estão no formato correto


def _seed_cotacoes(db, ativos: list[Ativo], org_id: int, periodo: str = "1y") -> int:
    mercados = {m.id: m.codigo for m in db.scalars(select(Mercado)).all()}
    total = 0
    for ativo in ativos:
        ticker_yf = _yf_ticker(ativo.ticker, mercados.get(ativo.mercado_id, "B3"))
        try:
            df = yf.download(ticker_yf, period=periodo, interval="1d", progress=False, auto_adjust=True)
        except Exception:
            continue
        if df.empty:
            continue
        if hasattr(df.columns, "nlevels") and df.columns.nlevels > 1:
            df.columns = df.columns.get_level_values(0)
        registros = []
        for idx, row in df.iterrows():
            if row.get("Close") is None:
                continue
            d = idx.date() if hasattr(idx, "date") else idx
            registros.append({
                "organizacao_id": org_id,
                "ativo_id": ativo.id,
                "data": d,
                "abertura": Decimal(str(round(float(row["Open"]), 6))) if row.get("Open") is not None else None,
                "maxima": Decimal(str(round(float(row["High"]), 6))) if row.get("High") is not None else None,
                "minima": Decimal(str(round(float(row["Low"]), 6))) if row.get("Low") is not None else None,
                "fechamento": Decimal(str(round(float(row["Close"]), 6))) if row.get("Close") is not None else None,
                "volume": int(row["Volume"]) if row.get("Volume") is not None else None,
                "fonte": "yfinance",
            })
        if registros:
            stmt = pg_insert(Cotacao).values(registros).on_conflict_do_nothing(
                index_elements=["ativo_id", "data"]
            )
            result = db.execute(stmt)
            total += result.rowcount or 0
            db.commit()
    print(f"  Cotacoes: {total} novas")
    return total


RSS_URL = "https://news.google.com/rss/search?q=mercado+financeiro&hl=pt-BR&gl=BR&ceid=BR:pt-419"


def _seed_noticias(db, org_id: int) -> int:
    fonte = db.scalar(select(Fonte).where(Fonte.nome == "Google News - Mercado", Fonte.organizacao_id == org_id))
    if not fonte:
        fonte = Fonte(organizacao_id=org_id, nome="Google News - Mercado", url="https://news.google.com", tipo="RSS")
        db.add(fonte)
        db.flush()

    try:
        feed = feedparser.parse(RSS_URL)
    except Exception as e:
        print(f"  Noticias: erro RSS ({e})")
        return 0

    inseridas = 0
    for entry in feed.entries:
        url = entry.link
        if db.scalar(select(Noticia).where(Noticia.url == url, Noticia.organizacao_id == org_id)):
            continue
        try:
            pub = parsedate_to_datetime(entry.published)
        except Exception:
            pub = datetime.now()
        titulo = entry.title.rsplit(" - ", 1)[0] if " - " in entry.title else entry.title
        db.add(Noticia(
            organizacao_id=org_id, fonte_id=fonte.id, titulo=titulo,
            url=url, resumo=entry.get("summary", ""), publicado_em=pub,
        ))
        inseridas += 1
    db.commit()
    print(f"  Noticias: {inseridas} novas")
    return inseridas


def run(org_id: int, skip_cotacoes: bool, skip_noticias: bool):
    db = SessionLocal()
    try:
        print(f"Populando organizacao #{org_id}...")
        _seed_referencia(db)
        ativos = _seed_ativos(db, org_id)
        db.commit()
        if not skip_cotacoes:
            _seed_cotacoes(db, ativos, org_id)
        if not skip_noticias:
            _seed_noticias(db, org_id)
        print("Concluido.")
    except Exception as e:
        db.rollback()
        print(f"ERRO: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--org-id", type=int, required=True)
    p.add_argument("--skip-cotacoes", action="store_true")
    p.add_argument("--skip-noticias", action="store_true")
    args = p.parse_args()
    run(args.org_id, args.skip_cotacoes, args.skip_noticias)