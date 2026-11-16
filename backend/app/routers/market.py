"""
Router de cotacoes ao vivo do INVEST AI.
Busca precos atualizados via yfinance com cache em memoria.
"""
from datetime import datetime
from typing import Optional

import pandas as pd
import yfinance as yf
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Ativo, Mercado
from app.schemas import LiveQuotesOut, LiveQuoteItem

router = APIRouter(prefix="/market", tags=["market"])

# Cache em memoria (dicionario) com TTL
_price_cache: dict = {}
_CACHE_TTL_SECONDS = 90


def _yf_ticker(ticker: str, mercado_codigo: str) -> str:
    """Converte o ticker do banco para o formato do Yahoo Finance."""
    if mercado_codigo == "B3":
        return f"{ticker}.SA"
    return ticker  # US e CRYPTO ja estao no formato correto


def _fetch_from_yf(tickers_yf: list[str]) -> dict:
    """
    Busca precos ao vivo via yfinance em uma unica chamada (batch).
    Retorna dict no formato {yf_ticker: {"price": ..., "previous_close": ...}}
    """
    if not tickers_yf:
        return {}

    try:
        # Se for 1 ticker, passa string; senao, passa lista
        tickers_arg = tickers_yf[0] if len(tickers_yf) == 1 else " ".join(tickers_yf)
        df = yf.download(
            tickers=tickers_arg,
            period="5d",
            interval="1d",
            progress=False,
            auto_adjust=False,
            threads=False,
            timeout=10,
        )
    except Exception as e:
        print(f"[market] Erro yfinance: {e}")
        return {}

    if df is None or df.empty:
        return {}

    result = {}

    # Caso 1: apenas 1 ticker -> colunas simples
    if len(tickers_yf) == 1:
        ticker = tickers_yf[0]
        try:
            closes = df["Close"].dropna()
            if len(closes) >= 2:
                result[ticker] = {
                    "price": float(closes.iloc[-1]),
                    "previous_close": float(closes.iloc[-2]),
                }
            elif len(closes) == 1:
                result[ticker] = {
                    "price": float(closes.iloc[0]),
                    "previous_close": float(closes.iloc[0]),
                }
        except Exception:
            pass
    # Caso 2: varios tickers -> MultiIndex
    else:
        for ticker in tickers_yf:
            try:
                closes = df["Close"][ticker].dropna()
                if len(closes) >= 2:
                    result[ticker] = {
                        "price": float(closes.iloc[-1]),
                        "previous_close": float(closes.iloc[-2]),
                    }
                elif len(closes) == 1:
                    result[ticker] = {
                        "price": float(closes.iloc[0]),
                        "previous_close": float(closes.iloc[0]),
                    }
            except (KeyError, IndexError):
                continue

    return result


@router.get("/prices", response_model=LiveQuotesOut)
def get_live_prices(
    tickers: str = Query(..., description="Lista de tickers separados por virgula (ex: PETR4,AAPL,BTC-USD)"),
    db: Session = Depends(get_db),
):
    """
    Retorna precos atualizados para uma lista de tickers.
    Usa cache de 90 segundos para evitar rate limiting do yfinance.
    """
    tickers_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not tickers_list:
        return LiveQuotesOut(
            quotes={},
            timestamp=datetime.now().isoformat(),
            cache_ttl_seconds=_CACHE_TTL_SECONDS,
        )

    # Busca o mercado de cada ticker no banco
    ativos = db.scalars(
        select(Ativo).where(Ativo.ticker.in_(tickers_list), Ativo.ativo.is_(True))
    ).all()

    mercados = {m.id: m.codigo for m in db.scalars(select(Mercado)).all()}
    ticker_to_market = {a.ticker: mercados.get(a.mercado_id, "B3") for a in ativos}

    # Separa o que esta em cache valido do que precisa buscar
    now = datetime.now()
    cached = {}
    to_fetch_yf = []

    for ticker in tickers_list:
        if ticker not in ticker_to_market:
            continue  # ticker invalido/nao encontrado
        cache_entry = _price_cache.get(ticker)
        if cache_entry and (now - cache_entry["cached_at"]).total_seconds() < _CACHE_TTL_SECONDS:
            cached[ticker] = cache_entry["data"]
        else:
            to_fetch_yf.append(ticker)

    # Busca os que faltam
    fetched = {}
    if to_fetch_yf:
        yf_map = {t: _yf_ticker(t, ticker_to_market[t]) for t in to_fetch_yf}
        raw = _fetch_from_yf(list(yf_map.values()))

        for original_ticker, yf_ticker in yf_map.items():
            data = raw.get(yf_ticker)
            if not data:
                continue
            price = data["price"]
            prev = data["previous_close"]
            change_pct = ((price - prev) / prev * 100) if prev > 0 else 0.0

            quote = LiveQuoteItem(
                ticker=original_ticker,
                price=round(price, 2),
                previous_close=round(prev, 2),
                change_pct=round(change_pct, 2),
                market=ticker_to_market[original_ticker],
            )
            fetched[original_ticker] = quote
            _price_cache[original_ticker] = {"data": quote, "cached_at": now}

    all_quotes = {**cached, **fetched}

    return LiveQuotesOut(
        quotes=all_quotes,
        timestamp=now.isoformat(),
        cache_ttl_seconds=_CACHE_TTL_SECONDS,
    )