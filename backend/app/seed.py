"""
Seed idempotente do INVEST AI.
Popula dados de referencia: mercados, tipos, perfis, carteiras e ativos.
Pode ser executado quantas vezes quiser - nao duplica registros.

Uso:
    python app\\seed.py
    ou
    python -m app.seed
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from decimal import Decimal  # noqa: E402

from sqlalchemy import select  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.database import SessionLocal  # noqa: E402
from app.models import Ativo, Carteira, Mercado, PerfilRisco, TipoAtivo  # noqa: E402


MERCADOS = [
    {"codigo": "B3",     "nome": "B3 - Brasil Bolsa Balcao", "pais": "BR", "moeda": "BRL", "fuso_horario": "America/Sao_Paulo"},
    {"codigo": "NYSE",   "nome": "New York Stock Exchange",  "pais": "US", "moeda": "USD", "fuso_horario": "America/New_York"},
    {"codigo": "NASDAQ", "nome": "NASDAQ",                   "pais": "US", "moeda": "USD", "fuso_horario": "America/New_York"},
]

TIPOS_ATIVO = [
    {"codigo": "ACAO", "nome": "Acao"},
    {"codigo": "FII",  "nome": "Fundo de Investimento Imobiliario"},
    {"codigo": "ETF",  "nome": "Exchange Traded Fund"},
    {"codigo": "BDR",  "nome": "Brazilian Depositary Receipt"},
]

PERFIS_RISCO = [
    {
        "codigo": "CONSERVADOR", "nome": "Conservador",
        "descricao": "Prioridade a preservacao de capital e menor volatilidade.",
        "capital_inicial_brl": Decimal("5000.00"),
        "max_perda_diaria_pct": Decimal("1.00"),
        "max_drawdown_pct": Decimal("5.00"),
        "max_exposicao_pct": Decimal("40.00"),
    },
    {
        "codigo": "MODERADO", "nome": "Moderado",
        "descricao": "Equilibrio entre risco e potencial de retorno.",
        "capital_inicial_brl": Decimal("5000.00"),
        "max_perda_diaria_pct": Decimal("2.00"),
        "max_drawdown_pct": Decimal("10.00"),
        "max_exposicao_pct": Decimal("60.00"),
    },
    {
        "codigo": "AGRESSIVO", "nome": "Agressivo",
        "descricao": "Maior tolerancia a volatilidade, com limites de perda definidos.",
        "capital_inicial_brl": Decimal("5000.00"),
        "max_perda_diaria_pct": Decimal("3.00"),
        "max_drawdown_pct": Decimal("20.00"),
        "max_exposicao_pct": Decimal("80.00"),
    },
]

ATIVOS = [
    {"ticker": "PETR4", "nome": "Petroleo Brasileiro S.A. - Petrobras PN", "mercado": "B3",     "tipo": "ACAO", "setor": "Petroleo e Gas"},
    {"ticker": "VALE3", "nome": "Vale S.A. ON",                            "mercado": "B3",     "tipo": "ACAO", "setor": "Mineracao"},
    {"ticker": "ITUB4", "nome": "Itau Unibanco Holding S.A. PN",           "mercado": "B3",     "tipo": "ACAO", "setor": "Bancos"},
    {"ticker": "BBAS3", "nome": "Banco do Brasil S.A. ON",                 "mercado": "B3",     "tipo": "ACAO", "setor": "Bancos"},
    {"ticker": "BBDC4", "nome": "Banco Bradesco S.A. PN",                  "mercado": "B3",     "tipo": "ACAO", "setor": "Bancos"},
    {"ticker": "ABEV3", "nome": "Ambev S.A. ON",                           "mercado": "B3",     "tipo": "ACAO", "setor": "Bebidas"},
    {"ticker": "AAPL",  "nome": "Apple Inc.",                              "mercado": "NASDAQ", "tipo": "ACAO", "setor": "Tecnologia"},
    {"ticker": "MSFT",  "nome": "Microsoft Corporation",                   "mercado": "NASDAQ", "tipo": "ACAO", "setor": "Tecnologia"},
    {"ticker": "NVDA",  "nome": "NVIDIA Corporation",                      "mercado": "NASDAQ", "tipo": "ACAO", "setor": "Semicondutores"},
    {"ticker": "AMZN",  "nome": "Amazon.com Inc.",                         "mercado": "NASDAQ", "tipo": "ACAO", "setor": "Varejo"},
    {"ticker": "JPM",   "nome": "JPMorgan Chase & Co.",                    "mercado": "NYSE",   "tipo": "ACAO", "setor": "Bancos"},
    {"ticker": "XOM",   "nome": "Exxon Mobil Corporation",                 "mercado": "NYSE",   "tipo": "ACAO", "setor": "Petroleo e Gas"},
]


def _seed_mercados(db: Session) -> int:
    inseridos = 0
    for dados in MERCADOS:
        if db.scalar(select(Mercado).where(Mercado.codigo == dados["codigo"])) is None:
            db.add(Mercado(**dados))
            inseridos += 1
    return inseridos


def _seed_tipos_ativo(db: Session) -> int:
    inseridos = 0
    for dados in TIPOS_ATIVO:
        if db.scalar(select(TipoAtivo).where(TipoAtivo.codigo == dados["codigo"])) is None:
            db.add(TipoAtivo(**dados))
            inseridos += 1
    return inseridos


def _seed_perfis_risco(db: Session) -> int:
    inseridos = 0
    for dados in PERFIS_RISCO:
        if db.scalar(select(PerfilRisco).where(PerfilRisco.codigo == dados["codigo"])) is None:
            db.add(PerfilRisco(**dados))
            inseridos += 1
    return inseridos


def _seed_carteiras(db: Session) -> int:
    db.flush()  # Garante IDs para os perfis
    perfis = {p.codigo: p for p in db.scalars(select(PerfilRisco)).all()}

    inseridos = 0
    for codigo_perfil, perfil in perfis.items():
        nome_carteira = f"Carteira {perfil.nome}"
        existe = db.scalar(select(Carteira).where(Carteira.nome == nome_carteira))
        if existe is None:
            db.add(Carteira(
                perfil_id=perfil.id,
                nome=nome_carteira,
                capital_inicial=perfil.capital_inicial_brl,
                saldo_caixa=perfil.capital_inicial_brl,
                taxa_corretagem_pct=Decimal("0.0000") # Zera taxa no MVP
            ))
            inseridos += 1
    return inseridos


def _seed_ativos(db: Session) -> int:
    db.flush()
    mercados_por_codigo = {m.codigo: m.id for m in db.scalars(select(Mercado)).all()}
    tipos_por_codigo = {t.codigo: t.id for t in db.scalars(select(TipoAtivo)).all()}

    inseridos = 0
    for dados in ATIVOS:
        mercado_id = mercados_por_codigo.get(dados["mercado"])
        tipo_id = tipos_por_codigo.get(dados["tipo"])
        if mercado_id is None or tipo_id is None:
            print(f"AVISO: ativo {dados['ticker']} ignorado.")
            continue
        existe = db.scalar(
            select(Ativo).where(Ativo.ticker == dados["ticker"], Ativo.mercado_id == mercado_id)
        )
        if existe is None:
            db.add(Ativo(
                ticker=dados["ticker"], nome=dados["nome"], mercado_id=mercado_id,
                tipo_id=tipo_id, setor=dados["setor"],
            ))
            inseridos += 1
    return inseridos


def run() -> None:
    db = SessionLocal()
    try:
        m = _seed_mercados(db)
        t = _seed_tipos_ativo(db)
        p = _seed_perfis_risco(db)
        c = _seed_carteiras(db)
        a = _seed_ativos(db)
        db.commit()
        print("Seed executado com sucesso.")
        print(f"  mercados inseridos:     {m}")
        print(f"  tipos_ativo inseridos:  {t}")
        print(f"  perfis_risco inseridos: {p}")
        print(f"  carteiras inseridas:    {c}")
        print(f"  ativos inseridos:       {a}")
    except Exception as e:
        db.rollback()
        print("Falha no seed. Nada foi gravado.")
        print(e)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()