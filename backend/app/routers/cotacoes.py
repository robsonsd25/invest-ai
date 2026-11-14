"""
Router de cotacoes historicas.
Devolve os dados OHLCV para graficos no frontend.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Ativo, Cotacao
from app.schemas import CotacaoOut

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

    # Busca as 'limit' cotacoes mais recentes
    stmt = (
        select(Cotacao)
        .where(Cotacao.ativo_id == ativo.id)
        .order_by(Cotacao.data.desc())
        .limit(limit)
    )
    cotacoes = db.scalars(stmt).all()

    # Inverte para o grafico ficar da data mais antiga para a mais recente
    cotacoes.reverse()
    
    return cotacoes
