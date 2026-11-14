"""
Router de Extrato da Carteira.
Devolve o histórico completo de operações simuladas com os dados do ativo.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Ativo, Carteira, OperacaoSimulada
from app.schemas import OperacaoExtratoOut

router = APIRouter(prefix="/carteiras", tags=["extrato"])

@router.get("/{carteira_id}/extrato", response_model=List[OperacaoExtratoOut])
def obter_extrato(carteira_id: int, db: Session = Depends(get_db)):
    carteira = db.get(Carteira, carteira_id)
    if not carteira:
        raise HTTPException(status_code=404, detail="Carteira nao encontrada.")

    # Busca todas as operações, da mais recente para a mais antiga (ordem decrescente)
    operacoes = db.execute(
        select(OperacaoSimulada, Ativo)
        .join(Ativo, OperacaoSimulada.ativo_id == Ativo.id)
        .where(OperacaoSimulada.carteira_id == carteira_id)
        .order_by(OperacaoSimulada.executada_em.desc())
    ).all()

    resultado = []
    for op, ativo in operacoes:
        resultado.append(
            OperacaoExtratoOut(
                id=op.id,
                ticker=ativo.ticker,
                nome_ativo=ativo.nome,
                tipo=op.tipo,
                quantidade=op.quantidade,
                preco_unitario=op.preco_unitario,
                custos=op.custos,
                executada_em=op.executada_em,
                origem=op.origem
            )
        )

    return resultado