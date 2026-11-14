"""
Router de analises do INVEST AI.
Gera e persiste sinais deterministicos.
"""
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.indicadores import calcular_snapshot
from app.models import Analise, Ativo, Cotacao, Mercado
from app.motor_analise import gerar_sinal
from app.schemas import AnaliseOut

router = APIRouter(prefix="/ativos", tags=["analises"])


@router.post("/{ticker}/analisar", response_model=AnaliseOut, status_code=201)
def gerar_e_salvar_analise(ticker: str, db: Session = Depends(get_db)):
    ticker_norm = ticker.upper()

    row = db.execute(
        select(Ativo, Mercado.codigo)
        .join(Mercado, Ativo.mercado_id == Mercado.id)
        .where(Ativo.ticker == ticker_norm, Ativo.ativo.is_(True))
    ).first()

    if row is None:
        raise HTTPException(status_code=404, detail=f"Ativo '{ticker_norm}' nao encontrado")

    ativo, _ = row

    cotacoes = db.scalars(
        select(Cotacao)
        .where(Cotacao.ativo_id == ativo.id)
        .where(Cotacao.fechamento.is_not(None))
        .order_by(Cotacao.data)
    ).all()

    if len(cotacoes) < 30:
        raise HTTPException(
            status_code=400,
            detail=f"Dados insuficientes para {ticker_norm} ({len(cotacoes)} cotacoes).",
        )

    datas = [c.data for c in cotacoes]
    valores = [float(c.fechamento) for c in cotacoes]
    serie = pd.Series(valores, index=datas)

    snapshot = calcular_snapshot(serie)
    resultado = gerar_sinal(snapshot, estrategia="SWING_TRADE")

    analise = Analise(
        ativo_id=ativo.id,
        estrategia=resultado.estrategia,
        sinal=resultado.sinal,
        justificativa=resultado.justificativa,
        versao_modelo=resultado.versao_modelo,
    )
    db.add(analise)
    db.commit()
    db.refresh(analise)
    return analise


@router.get("/{ticker}/analises", response_model=list[AnaliseOut])
def listar_analises(ticker: str, db: Session = Depends(get_db)):
    ticker_norm = ticker.upper()

    ativo_id = db.scalar(
        select(Ativo.id).where(Ativo.ticker == ticker_norm, Ativo.ativo.is_(True))
    )
    if ativo_id is None:
        raise HTTPException(status_code=404, detail=f"Ativo '{ticker_norm}' nao encontrado")

    stmt = (
        select(Analise)
        .where(Analise.ativo_id == ativo_id)
        .order_by(Analise.gerada_em.desc())
    )
    return list(db.scalars(stmt).all())