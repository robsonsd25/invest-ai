"""
Router de Backtesting do INVEST AI.
Roda estrategias deterministicas sobre o historico de cotacoes.
"""
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from datetime import timedelta

from app.database import get_db
from app.models import Ativo, Cotacao
from app.schemas import (
    BacktestRequest, BacktestResultadoOut, BacktestTradeOut, BacktestPontoOut
)
from app.indicadores import rsi, ema, sma, macd

router = APIRouter(prefix="/backtesting", tags=["backtesting"])

ESTRATEGIAS_VALIDAS = ["RSI", "MEDIAS", "MACD"]


@router.post("/run", response_model=BacktestResultadoOut)
def rodar_backtest(dados: BacktestRequest, db: Session = Depends(get_db)):
    estrategia = dados.estrategia.strip().upper()
    if estrategia not in ESTRATEGIAS_VALIDAS:
        raise HTTPException(
            status_code=400,
            detail=f"Estrategia invalida. Use: {', '.join(ESTRATEGIAS_VALIDAS)}"
        )

    ativo = db.scalar(select(Ativo).where(Ativo.ticker == dados.ticker.strip().upper()))
    if not ativo:
        raise HTTPException(status_code=404, detail=f"Ativo '{dados.ticker}' nao encontrado.")

    # Carrega cotacoes do periodo (com 60 dias de folga para indicadores)
    cotacoes = db.scalars(
        select(Cotacao)
        .where(Cotacao.ativo_id == ativo.id, Cotacao.fechamento.is_not(None))
        .order_by(Cotacao.data.desc())
        .limit(dados.periodo_dias + 60)
    ).all()
    cotacoes = list(reversed(cotacoes))

    if len(cotacoes) < 60:
        raise HTTPException(
            status_code=400,
            detail=f"Dados insuficientes para backtest ({len(cotacoes)} cotacoes, minimo 60)."
        )

    # Serie de precos
    precos = [float(c.fechamento) for c in cotacoes]
    datas = [c.data for c in cotacoes]
    serie = pd.Series(precos)

    # Calcula indicadores (series completas)
    serie_rsi = rsi(serie, 14) if estrategia == "RSI" else None
    serie_ema9 = ema(serie, 9) if estrategia == "MEDIAS" else None
    serie_sma20 = sma(serie, 20) if estrategia == "MEDIAS" else None
    macd_linha, macd_sinal, macd_hist = macd(serie) if estrategia == "MACD" else (None, None, None)

    # Simulacao
    capital = dados.capital_inicial
    posicao = 0
    operacoes = []
    curva = []
    preco_compra_atual = 0.0  # para calcular win/loss

    num_wins = 0
    num_losses = 0

    for i in range(len(precos)):
        preco = precos[i]
        data = datas[i]
        sinal = "MANUTENCAO"

        # Determina sinal pelo indicador
        if estrategia == "RSI":
            v = serie_rsi.iloc[i] if serie_rsi is not None else None
            if v is not None and not pd.isna(v):
                if v < 30: sinal = "COMPRA"
                elif v > 70: sinal = "VENDA"
        elif estrategia == "MEDIAS":
            e = serie_ema9.iloc[i] if serie_ema9 is not None else None
            s = serie_sma20.iloc[i] if serie_sma20 is not None else None
            if e is not None and s is not None and not pd.isna(e) and not pd.isna(s):
                if e > s: sinal = "COMPRA"
                elif e < s: sinal = "VENDA"
        elif estrategia == "MACD":
            h = macd_hist.iloc[i] if macd_hist is not None else None
            if h is not None and not pd.isna(h):
                if h > 0: sinal = "COMPRA"
                elif h < 0: sinal = "VENDA"

        # Executa a operacao
        if sinal == "COMPRA" and posicao == 0:
            qtd = int(capital / preco)
            if qtd > 0:
                valor = round(qtd * preco, 2)
                capital -= valor
                posicao = qtd
                preco_compra_atual = preco
                operacoes.append(BacktestTradeOut(
                    data=data.strftime("%Y-%m-%d"),
                    tipo="COMPRA",
                    preco=round(preco, 2),
                    quantidade=qtd,
                    valor=valor,
                ))
        elif sinal == "VENDA" and posicao > 0:
            valor = round(posicao * preco, 2)
            capital += valor
            if preco > preco_compra_atual:
                num_wins += 1
            else:
                num_losses += 1
            operacoes.append(BacktestTradeOut(
                data=data.strftime("%Y-%m-%d"),
                tipo="VENDA",
                preco=round(preco, 2),
                quantidade=posicao,
                valor=valor,
            ))
            posicao = 0

        # Registra ponto da curva a cada ~3 dias
        patrimonio_dia = capital + (posicao * preco)
        if i % 3 == 0 or i == len(precos) - 1:
            curva.append(BacktestPontoOut(
                data=data.strftime("%Y-%m-%d"),
                valor=round(patrimonio_dia, 2),
            ))

    # Fecha posicao aberta no ultimo dia
    if posicao > 0:
        preco_final = precos[-1]
        valor = round(posicao * preco_final, 2)
        capital += valor
        if preco_final > preco_compra_atual:
            num_wins += 1
        else:
            num_losses += 1
        operacoes.append(BacktestTradeOut(
            data=datas[-1].strftime("%Y-%m-%d"),
            tipo="VENDA",
            preco=round(preco_final, 2),
            quantidade=posicao,
            valor=valor,
        ))
        posicao = 0

    # Metricas finais
    capital_final = round(capital, 2)
    lucro = round(capital_final - dados.capital_inicial, 2)
    rentabilidade = round((lucro / dados.capital_inicial) * 100, 2) if dados.capital_inicial > 0 else 0.0
    num_operacoes = len(operacoes)
    num_round_trips = num_wins + num_losses
    taxa_acerto = round((num_wins / num_round_trips) * 100, 2) if num_round_trips > 0 else 0.0

    # Benchmark: comprar e segurar
    indice_inicio = 60  # pula a fase de aquecimento dos indicadores
    if indice_inicio < len(precos):
        preco_inicio = precos[indice_inicio]
        preco_fim = precos[-1]
        qtd_bh = int(dados.capital_inicial / preco_inicio)
        capital_bh = (dados.capital_inicial - qtd_bh * preco_inicio) + qtd_bh * preco_fim
        benchmark_pct = round(((capital_bh - dados.capital_inicial) / dados.capital_inicial) * 100, 2)
    else:
        benchmark_pct = 0.0

    return BacktestResultadoOut(
        ticker=ativo.ticker,
        estrategia=estrategia,
        periodo_inicio=datas[indice_inicio].strftime("%Y-%m-%d") if indice_inicio < len(datas) else datas[0].strftime("%Y-%m-%d"),
        periodo_fim=datas[-1].strftime("%Y-%m-%d"),
        capital_inicial=dados.capital_inicial,
        capital_final=capital_final,
        lucro_prejuizo=lucro,
        rentabilidade_pct=rentabilidade,
        benchmark_buy_hold_pct=benchmark_pct,
        num_operacoes=num_operacoes,
        num_wins=num_wins,
        num_losses=num_losses,
        taxa_acerto_pct=taxa_acerto,
        curva_patrimonio=curva,
        operacoes=operacoes,
    )