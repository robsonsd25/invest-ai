"""
Router de Extrato da Carteira.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Ativo, Carteira, OperacaoSimulada, Usuario
from app.schemas import OperacaoExtratoOut
from app.routers.auth import get_current_user

router = APIRouter(prefix="/carteiras", tags=["extrato"])

@router.get("/{carteira_id}/extrato", response_model=List[OperacaoExtratoOut])
def obter_extrato(
    carteira_id: int, 
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    carteira = db.get(Carteira, carteira_id)
    # TRAVA DE SEGURANCA
    if not carteira or carteira.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado a esta carteira.")

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