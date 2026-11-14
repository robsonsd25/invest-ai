"""
Motor de analise deterministico do INVEST AI.
Gera sinais de COMPRA, VENDA ou MANUTENCAO com base em regras matematicas
explicitas sobre os indicadores tecnicos. Nao usa LLM, nao usa aleatoriedade.
"""
from dataclasses import dataclass

from app.indicadores import SnapshotIndicadores

VERSAO_MODELO = "MOTOR_V1_2026"


@dataclass(frozen=True)
class ResultadoAnalise:
    sinal: str
    estrategia: str
    justificativa: str
    versao_modelo: str


def _fmt(v: float | None, casas: int = 2) -> str:
    return "N/A" if v is None else f"{v:.{casas}f}"


def gerar_sinal(snapshot: SnapshotIndicadores, estrategia: str = "SWING_TRADE") -> ResultadoAnalise:
    """
    Aplica as regras do motor V1 sobre o snapshot de indicadores.
    Estrategia suportada nesta versao: SWING_TRADE.
    """
    if estrategia != "SWING_TRADE":
        return ResultadoAnalise(
            sinal="MANUTENCAO",
            estrategia=estrategia,
            justificativa=f"Estrategia '{estrategia}' ainda nao implementada no motor {VERSAO_MODELO}.",
            versao_modelo=VERSAO_MODELO,
        )

    # Dados ausentes? Nao arrisca sinal.
    if snapshot.rsi_14 is None or snapshot.ema_9 is None or snapshot.sma_20 is None or snapshot.macd_histograma is None:
        return ResultadoAnalise(
            sinal="MANUTENCAO",
            estrategia=estrategia,
            justificativa="Indicadores insuficientes para gerar sinal (historico curto).",
            versao_modelo=VERSAO_MODELO,
        )

    rsi = snapshot.rsi_14
    ema9 = snapshot.ema_9
    sma20 = snapshot.sma_20
    macd_hist = snapshot.macd_histograma
    fechamento = snapshot.fechamento

    # Regra 1: COMPRA por sobrevenda (RSI < 30)
    if rsi < 30:
        return ResultadoAnalise(
            sinal="COMPRA",
            estrategia=estrategia,
            justificativa=(
                f"RSI(14) em {_fmt(rsi)} (abaixo de 30), indicando sobrevenda. "
                f"Fechamento atual: {_fmt(fechamento)}."
            ),
            versao_modelo=VERSAO_MODELO,
        )

    # Regra 2: VENDA por sobrecompra (RSI > 70)
    if rsi > 70:
        return ResultadoAnalise(
            sinal="VENDA",
            estrategia=estrategia,
            justificativa=(
                f"RSI(14) em {_fmt(rsi)} (acima de 70), indicando sobrecompra. "
                f"Fechamento atual: {_fmt(fechamento)}."
            ),
            versao_modelo=VERSAO_MODELO,
        )

    # Regra 3: COMPRA por tendência de alta (EMA9 > SMA20 e MACD > 0)
    if ema9 > sma20 and macd_hist > 0:
        return ResultadoAnalise(
            sinal="COMPRA",
            estrategia=estrategia,
            justificativa=(
                f"EMA(9) ({_fmt(ema9)}) acima da SMA(20) ({_fmt(sma20)}) "
                f"e MACD histograma positivo ({_fmt(macd_hist, 4)}), indicando momentum de alta."
            ),
            versao_modelo=VERSAO_MODELO,
        )

    # Regra 4: VENDA por tendência de baixa (EMA9 < SMA20 e MACD < 0)
    if ema9 < sma20 and macd_hist < 0:
        return ResultadoAnalise(
            sinal="VENDA",
            estrategia=estrategia,
            justificativa=(
                f"EMA(9) ({_fmt(ema9)}) abaixo da SMA(20) ({_fmt(sma20)}) "
                f"e MACD histograma negativo ({_fmt(macd_hist, 4)}), indicando momentum de baixa."
            ),
            versao_modelo=VERSAO_MODELO,
        )

    # Default: MANUTENCAO
    return ResultadoAnalise(
        sinal="MANUTENCAO",
        estrategia=estrategia,
        justificativa=(
            f"Sem sinal claro. RSI em {_fmt(rsi)}, "
            f"EMA9 em {_fmt(ema9)} e SMA20 em {_fmt(sma20)}."
        ),
        versao_modelo=VERSAO_MODELO,
    )