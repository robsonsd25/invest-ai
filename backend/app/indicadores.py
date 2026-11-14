"""
Indicadores tecnicos determinísticos do INVEST AI.
Funcoes puras - recebem Series do pandas, retornam Series/valores.
Sem dependencia do banco, sem estado global, sem aleatoriedade.
Testaveis e reproduziveis.
"""
from dataclasses import dataclass
from decimal import Decimal

import pandas as pd


def sma(serie: pd.Series, periodo: int) -> pd.Series:
    """Simple Moving Average."""
    if periodo <= 0:
        raise ValueError("periodo deve ser > 0")
    return serie.rolling(window=periodo, min_periods=periodo).mean()


def ema(serie: pd.Series, periodo: int) -> pd.Series:
    """Exponential Moving Average (ajuste classico do pandas)."""
    if periodo <= 0:
        raise ValueError("periodo deve ser > 0")
    return serie.ewm(span=periodo, adjust=False).mean()


def rsi(serie: pd.Series, periodo: int = 14) -> pd.Series:
    """
    Relative Strength Index (Wilder suavizado).
    Retorna valores entre 0 e 100.
    """
    if periodo <= 0:
        raise ValueError("periodo deve ser > 0")
    delta = serie.diff()
    ganhos = delta.clip(lower=0)
    perdas = -delta.clip(upper=0)
    media_ganhos = ganhos.ewm(alpha=1 / periodo, adjust=False).mean()
    media_perdas = perdas.ewm(alpha=1 / periodo, adjust=False).mean()
    rs = media_ganhos / media_perdas
    return 100 - (100 / (1 + rs))


def macd(
    serie: pd.Series,
    rapido: int = 12,
    lento: int = 26,
    sinal: int = 9,
) -> tuple[pd.Series, pd.Series, pd.Series]:
    """
    MACD classico.
    Retorna (linha MACD, linha de sinal, histograma).
    """
    ema_rapida = ema(serie, rapido)
    ema_lenta = ema(serie, lento)
    linha = ema_rapida - ema_lenta
    linha_sinal = ema(linha, sinal)
    histograma = linha - linha_sinal
    return linha, linha_sinal, histograma


@dataclass(frozen=True)
class SnapshotIndicadores:
    """Conjunto dos ultimos valores dos indicadores, para uma data."""

    data: str
    fechamento: float
    sma_20: float | None
    sma_50: float | None
    sma_200: float | None
    ema_9: float | None
    rsi_14: float | None
    macd_linha: float | None
    macd_sinal: float | None
    macd_histograma: float | None
    total_cotacoes: int


def _round_opt(valor, casas: int = 6) -> float | None:
    """Converte para float arredondado, mantendo None se NaN."""
    if valor is None:
        return None
    try:
        f = float(valor)
    except (TypeError, ValueError):
        return None
    if pd.isna(f):
        return None
    return round(f, casas)


def calcular_snapshot(serie_fechamentos: pd.Series) -> SnapshotIndicadores:
    """
    Recebe a serie de fechamentos (ordenada por data ascendente)
    e devolve os indicadores mais recentes.
    """
    if serie_fechamentos.empty:
        raise ValueError("serie de fechamentos vazia")

    if not serie_fechamentos.index.equals(pd.RangeIndex(len(serie_fechamentos))):
        serie = serie_fechamentos.reset_index(drop=True)
        datas = list(serie_fechamentos.index)
    else:
        serie = serie_fechamentos
        datas = list(range(len(serie)))

    s20 = sma(serie, 20)
    s50 = sma(serie, 50)
    s200 = sma(serie, 200)
    e9 = ema(serie, 9)
    r14 = rsi(serie, 14)
    m_linha, m_sinal, m_hist = macd(serie)

    ultimo = -1
    data_ref = datas[ultimo]
    if hasattr(data_ref, "isoformat"):
        data_ref_str = data_ref.isoformat()[:10]
    else:
        data_ref_str = str(data_ref)

    return SnapshotIndicadores(
        data=data_ref_str,
        fechamento=round(float(serie.iloc[ultimo]), 6),
        sma_20=_round_opt(s20.iloc[ultimo]),
        sma_50=_round_opt(s50.iloc[ultimo]),
        sma_200=_round_opt(s200.iloc[ultimo]),
        ema_9=_round_opt(e9.iloc[ultimo]),
        rsi_14=_round_opt(r14.iloc[ultimo], 2),
        macd_linha=_round_opt(m_linha.iloc[ultimo]),
        macd_sinal=_round_opt(m_sinal.iloc[ultimo]),
        macd_histograma=_round_opt(m_hist.iloc[ultimo]),
        total_cotacoes=len(serie),
    )