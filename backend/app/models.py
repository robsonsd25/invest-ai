"""
Modelos ORM do INVEST AI (SQLAlchemy 2.x).
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    BigInteger, Boolean, CheckConstraint, Date, DateTime, ForeignKey, Index,
    Integer, Numeric, SmallInteger, String, Text, UniqueConstraint, func, text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Mercado(Base):
    __tablename__ = "mercados"

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    codigo: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    pais: Mapped[str] = mapped_column(String(2), nullable=False)
    moeda: Mapped[str] = mapped_column(String(3), nullable=False)
    fuso_horario: Mapped[str] = mapped_column(String(50), nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class TipoAtivo(Base):
    __tablename__ = "tipos_ativo"

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    codigo: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    nome: Mapped[str] = mapped_column(String(50), nullable=False)


class PerfilRisco(Base):
    __tablename__ = "perfis_risco"

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    codigo: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    nome: Mapped[str] = mapped_column(String(50), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text)
    capital_inicial_brl: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, server_default=text("5000.00"))
    max_perda_diaria_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, server_default=text("2.00"))
    max_drawdown_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, server_default=text("10.00"))
    max_exposicao_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, server_default=text("50.00"))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Ativo(Base):
    __tablename__ = "ativos"
    __table_args__ = (
        UniqueConstraint("ticker", "mercado_id", name="uq_ativos_ticker_mercado"),
        Index("idx_ativos_ticker", "ticker"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticker: Mapped[str] = mapped_column(String(20), nullable=False)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    mercado_id: Mapped[int] = mapped_column(SmallInteger, ForeignKey("mercados.id"), nullable=False)
    tipo_id: Mapped[Optional[int]] = mapped_column(SmallInteger, ForeignKey("tipos_ativo.id"))
    setor: Mapped[Optional[str]] = mapped_column(String(100))
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Cotacao(Base):
    __tablename__ = "cotacoes"
    __table_args__ = (
        UniqueConstraint("ativo_id", "data", name="uq_cotacoes_ativo_data"),
        Index("idx_cotacoes_ativo_data", "ativo_id", text("data DESC")),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    ativo_id: Mapped[int] = mapped_column(Integer, ForeignKey("ativos.id", ondelete="CASCADE"), nullable=False)
    data: Mapped[date] = mapped_column(Date, nullable=False)
    abertura: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 6))
    maxima: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 6))
    minima: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 6))
    fechamento: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 6))
    volume: Mapped[Optional[int]] = mapped_column(BigInteger)
    fonte: Mapped[Optional[str]] = mapped_column(String(50))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Fonte(Base):
    __tablename__ = "fontes"

    id: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    nome: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    url: Mapped[Optional[str]] = mapped_column(String(500))
    tipo: Mapped[Optional[str]] = mapped_column(String(50))


class Noticia(Base):
    __tablename__ = "noticias"
    __table_args__ = (
        Index("idx_noticias_publicado", text("publicado_em DESC")),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    fonte_id: Mapped[Optional[int]] = mapped_column(SmallInteger, ForeignKey("fontes.id"))
    titulo: Mapped[str] = mapped_column(String(500), nullable=False)
    url: Mapped[Optional[str]] = mapped_column(String(1000), unique=True)
    resumo: Mapped[Optional[str]] = mapped_column(Text)
    publicado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    coletado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Carteira(Base):
    __tablename__ = "carteiras"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("usuarios.id"), nullable=True)
    perfil_id: Mapped[int] = mapped_column(SmallInteger, ForeignKey("perfis_risco.id"), nullable=False)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    capital_inicial: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    saldo_caixa: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    moeda: Mapped[str] = mapped_column(String(3), nullable=False, server_default=text("'BRL'"))
    taxa_corretagem_pct: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False, server_default=text("0.0000"))
    ativa: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    criada_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class OperacaoSimulada(Base):
    __tablename__ = "operacoes_simuladas"
    __table_args__ = (
        CheckConstraint("tipo IN ('COMPRA','VENDA')", name="ck_ops_tipo"),
        CheckConstraint("quantidade > 0", name="ck_ops_quantidade"),
        CheckConstraint("preco_unitario > 0", name="ck_ops_preco"),
        Index("idx_ops_carteira_data", "carteira_id", text("executada_em DESC")),
        Index("idx_ops_ativo", "ativo_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    carteira_id: Mapped[int] = mapped_column(Integer, ForeignKey("carteiras.id", ondelete="CASCADE"), nullable=False)
    ativo_id: Mapped[int] = mapped_column(Integer, ForeignKey("ativos.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(10), nullable=False)
    quantidade: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    preco_unitario: Mapped[Decimal] = mapped_column(Numeric(18, 6), nullable=False)
    custos: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, server_default=text("0"))
    executada_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    origem: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'MANUAL'"))
    observacao: Mapped[Optional[str]] = mapped_column(Text)


class Analise(Base):
    __tablename__ = "analises"
    __table_args__ = (
        CheckConstraint("estrategia IN ('DAY_TRADE','SWING_TRADE','BUY_HOLD')", name="ck_analises_estrategia"),
        CheckConstraint("sinal IN ('COMPRA','VENDA','MANUTENCAO')", name="ck_analises_sinal"),
        Index("idx_analises_ativo_data", "ativo_id", text("gerada_em DESC")),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    ativo_id: Mapped[int] = mapped_column(Integer, ForeignKey("ativos.id"), nullable=False)
    estrategia: Mapped[str] = mapped_column(String(30), nullable=False)
    sinal: Mapped[str] = mapped_column(String(20), nullable=False)
    justificativa: Mapped[str] = mapped_column(Text, nullable=False)
    versao_modelo: Mapped[str] = mapped_column(String(20), nullable=False)
    gerada_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    validada: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))


class LimiteRisco(Base):
    __tablename__ = "limites_risco"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    perfil_id: Mapped[int] = mapped_column(SmallInteger, ForeignKey("perfis_risco.id"), nullable=False)
    max_exposicao_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    max_perda_diaria_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    max_drawdown_pct: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Favorito(Base):
    __tablename__ = "favoritos"
    __table_args__ = (
        UniqueConstraint("usuario_id", "ativo_id", name="uq_favorito_user_ativo"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False)
    ativo_id: Mapped[int] = mapped_column(Integer, ForeignKey("ativos.id", ondelete="CASCADE"), nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)