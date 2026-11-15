"""
Router do Radar de Oportunidades.
Varre todos os ativos e ranqueia as melhores oportunidades.
"""
import pandas as pd
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.indicadores import calcular_snapshot
from app.models import Ativo, Cotacao, Mercado
from app.motor_analise import gerar_sinal
from app.schemas import RadarResultadoOut, RadarItemOut

router = APIRouter(prefix="/radar", tags=["radar"])

@router.get("", response_model=RadarResultadoOut)
def gerar_radar(db: Session = Depends(get_db)):
    ativos = db.scalars(
        select(Ativo)
        .join(Mercado, Ativo.mercado_id == Mercado.id)
        .where(Ativo.ativo.is_(True))
        .order_by(Ativo.ticker)
    ).all()

    compras = []
    vendas = []
    manutencoes = []

    for ativo in ativos:
        mercado = db.get(Mercado, ativo.mercado_id)
        
        cotacoes = db.scalars(
            select(Cotacao)
            .where(Cotacao.ativo_id == ativo.id, Cotacao.fechamento.is_not(None))
            .order_by(Cotacao.data.asc())
            .limit(300)
        ).all()

        if len(cotacoes) < 30:
            continue

        datas = [c.data for c in cotacoes]
        valores = [float(c.fechamento) for c in cotacoes]
        serie = pd.Series(valores, index=datas)

        try:
            snapshot = calcular_snapshot(serie)
            resultado = gerar_sinal(snapshot, estrategia="SWING_TRADE")

            item = RadarItemOut(
                ticker=ativo.ticker,
                nome=ativo.nome,
                mercado=mercado.codigo,
                fechamento=snapshot.fechamento,
                sinal=resultado.sinal,
                justificativa=resultado.justificativa,
                rsi_14=snapshot.rsi_14 # <--- Passando o RSI
            )

            if resultado.sinal == "COMPRA":
                compras.append(item)
            elif resultado.sinal == "VENDA":
                vendas.append(item)
            else:
                manutencoes.append(item)
        except Exception:
            continue

    # --- ORDENACAO DE RANKING ---
    # Compras: Menor RSI primeiro (mais sobrevendido = melhor oportunidade)
    compras.sort(key=lambda x: x.rsi_14 if x.rsi_14 is not None else 999)
    
    # Vendas: Maior RSI primeiro (mais sobrecomprado = melhor oportunidade de venda)
    vendas.sort(key=lambda x: x.rsi_14 if x.rsi_14 is not None else -999, reverse=True)

    return RadarResultadoOut(
        compra=compras,
        venda=vendas,
        manutencao=manutencoes
    )