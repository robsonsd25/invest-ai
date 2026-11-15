"""
Router de cotacoes historicas.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Ativo, Cotacao
from app.schemas import CotacaoOut, PrecoAtualOut

router = APIRouter(prefix="/ativos", tags=["cotacoes"])

@router.get("/{ticker}/cotacoes", response_model=List[CotacaoOut])
def listar_cotacoes(
    ticker: str,
    limit: int = Query(default=60, description="Numero de dias para tras"),
    db: Session = Depends(get_db)
):
    ticker_norm = ticker.strip().upper()
    ativo = db.scalar(select(Ativo).where(Ativo.ticker == ticker_norm, Ativo.ativo.is_(True)))
    if not ativo:
        raise HTTPException(status_code=404, detail="Ativo nao encontrado")

    stmt = (
        select(Cotacao)
        .where(Cotacao.ativo_id == ativo.id)
        .order_by(Cotacao.data.desc())
        .limit(limit)
    )
    cotacoes = db.scalars(stmt).all()
    cotacoes.reverse()
    return cotacoes

@router.get("/{ticker}/preco-atual", response_model=PrecoAtualOut)
def obter_preco_atual(ticker: str, db: Session = Depends(get_db)):
    ticker_norm = ticker.strip().upper()
    ativo = db.scalar(select(Ativo).where(Ativo.ticker == ticker_norm, Ativo.ativo.is_(True)))
    if not ativo:
        raise HTTPException(status_code=404, detail="Ativo nao encontrado")

    cotacao = db.scalar(
        select(Cotacao)
        .where(Cotacao.ativo_id == ativo.id)
        .order_by(Cotacao.data.desc())
        .limit(1)
    )
    
    if not cotacao or not cotacao.fechamento:
        raise HTTPException(status_code=404, detail="Cotacao indisponivel para este ativo")

    return PrecoAtualOut(
        ticker=ativo.ticker,
        preco_atual=float(cotacao.fechamento),
        data=cotacao.data
    )