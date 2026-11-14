"""
Schemas Pydantic do INVEST AI.
Definem o formato das respostas da API.
"""
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field

class HealthResponse(BaseModel):
    status: str
    backend: str
    banco: str
    database: str
    postgres: str

class MercadoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    codigo: str
    nome: str
    pais: str
    moeda: str
    fuso_horario: str

class PerfilRiscoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    codigo: str
    nome: str
    descricao: str | None
    capital_inicial_brl: Decimal
    max_perda_diaria_pct: Decimal
    max_drawdown_pct: Decimal
    max_exposicao_pct: Decimal

class CarteiraOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    perfil_id: int
    nome: str
    capital_inicial: Decimal
    saldo_caixa: Decimal
    moeda: str
    ativa: bool
    criada_em: datetime

class AtivoOut(BaseModel):
    id: int
    ticker: str
    nome: str
    setor: str | None
    ativo: bool
    mercado_codigo: str
    mercado_nome: str
    tipo_codigo: str | None

class IndicadoresOut(BaseModel):
    ticker: str
    nome: str
    mercado: str
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

class AnaliseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    ativo_id: int
    estrategia: str
    sinal: str
    justificativa: str
    versao_modelo: str
    gerada_em: datetime
    validada: bool

class OperacaoCreate(BaseModel):
    ticker: str = Field(..., description="Ticker do ativo (ex: PETR4)")
    tipo: str = Field(..., description="COMPRA ou VENDA")
    quantidade: Decimal = Field(..., gt=0, description="Quantidade de acoes (deve ser maior que zero)")
    preco_unitario: Decimal = Field(..., gt=0, description="Preco unitario no momento da simulacao")

class OperacaoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    carteira_id: int
    ativo_id: int
    tipo: str
    quantidade: Decimal
    preco_unitario: Decimal
    custos: Decimal
    executada_em: datetime
    origem: str
    observacao: str | None

class CarteiraResumoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome: str
    saldo_caixa: Decimal
    capital_inicial: Decimal

class CotacaoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    data: date
    abertura: Decimal | None
    maxima: Decimal | None
    minima: Decimal | None
    fechamento: Decimal | None
    volume: int | None

class RadarItemOut(BaseModel):
    ticker: str
    nome: str
    mercado: str
    fechamento: float
    sinal: str
    justificativa: str

class RadarResultadoOut(BaseModel):
    compra: list[RadarItemOut]
    venda: list[RadarItemOut]
    manutencao: list[RadarItemOut]

# NOVO SCHEMA DE EXTRATO
class OperacaoExtratoOut(BaseModel):
    id: int
    ticker: str
    nome_ativo: str
    tipo: str
    quantidade: Decimal
    preco_unitario: Decimal
    custos: Decimal
    executada_em: datetime
    origem: str

class UsuarioCreate(BaseModel):
    nome: str
    email: str
    senha: str

class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    nome: str
    email: str
    ativo: bool
    criado_em: datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginRequest(BaseModel):
    email: str
    senha: str