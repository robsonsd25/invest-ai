"""
Router do Radar de Oportunidades.
Varre todos os ativos do banco e roda o motor de análise.
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
    # Busca todos os ativos ativos no banco
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
        # Pega o mercado do ativo
        mercado = db.get(Mercado, ativo.mercado_id)
        
        # Pega as últimas 300 cotações
        cotacoes = db.scalars(
            select(Cotacao)
            .where(Cotacao.ativo_id == ativo.id, Cotacao.fechamento.is_not(None))
            .order_by(Cotacao.data.asc())
            .limit(300)
        ).all()

        if len(cotacoes) < 30:
            # Se não tem dados suficientes, pula
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
                justificativa=resultado.justificativa
            )

            if resultado.sinal == "COMPRA":
                compras.append(item)
            elif resultado.sinal == "VENDA":
                vendas.append(item)
            else:
                manutencoes.append(item)
        except Exception:
            # Se der algum erro no cálculo, ignora o ativo
            continue

    return RadarResultadoOut(
        compra=compras,
        venda=vendas,
        manutencao=manutencoes
    )