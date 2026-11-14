"""
Router de indicadores tecnicos do INVEST AI.
Calcula SMA, EMA, RSI e MACD a partir das cotacoes historicas.
Todos os calculos sao deterministicos (sem LLM, sem aleatoriedade).
"""
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.indicadores import calcular_snapshot
from app.models import Ativo, Cotacao, Mercado
from app.schemas import IndicadoresOut

router = APIRouter(prefix="/ativos", tags=["indicadores"])

MIN_COTACOES = 30  # minimo para indicadores relevantes


@router.get("/{ticker}/indicadores", response_model=IndicadoresOut)
def obter_indicadores(ticker: str, db: Session = Depends(get_db)):
    ticker_norm = ticker.upper()

    row = db.execute(
        select(Ativo, Mercado.codigo)
        .join(Mercado, Ativo.mercado_id == Mercado.id)
        .where(Ativo.ticker == ticker_norm, Ativo.ativo.is_(True))
    ).first()

    if row is None:
        raise HTTPException(status_code=404, detail=f"Ativo '{ticker_norm}' nao encontrado")

    ativo, mercado_codigo = row

    cotacoes = db.scalars(
        select(Cotacao)
        .where(Cotacao.ativo_id == ativo.id)
        .where(Cotacao.fechamento.is_not(None))
        .order_by(Cotacao.data)
    ).all()

    if len(cotacoes) < MIN_COTACOES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Dados insuficientes para {ticker_norm}: "
                f"{len(cotacoes)} cotacoes (minimo {MIN_COTACOES})."
            ),
        )

    datas = [c.data for c in cotacoes]
    valores = [float(c.fechamento) for c in cotacoes]
    serie = pd.Series(valores, index=datas)

    snapshot = calcular_snapshot(serie)

    return IndicadoresOut(
        ticker=ativo.ticker,
        nome=ativo.nome,
        mercado=mercado_codigo,
        data=snapshot.data,
        fechamento=snapshot.fechamento,
        sma_20=snapshot.sma_20,
        sma_50=snapshot.sma_50,
        sma_200=snapshot.sma_200,
        ema_9=snapshot.ema_9,
        rsi_14=snapshot.rsi_14,
        macd_linha=snapshot.macd_linha,
        macd_sinal=snapshot.macd_sinal,
        macd_histograma=snapshot.macd_histograma,
        total_cotacoes=snapshot.total_cotacoes,
    )