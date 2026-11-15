"""
Router de carteiras do INVEST AI.
"""
from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Carteira, OperacaoSimulada, Ativo, Cotacao, Usuario
from app.schemas import CarteiraOut, PatrimonioGeralOut
from app.routers.auth import get_current_user

router = APIRouter(prefix="/carteiras", tags=["carteiras"])

@router.get("", response_model=list[CarteiraOut])
def listar_carteiras(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    stmt = select(Carteira).where(Carteira.usuario_id == current_user.id).order_by(Carteira.id)
    return list(db.scalars(stmt).all())

@router.get("/resumo-geral", response_model=PatrimonioGeralOut)
def resumo_geral(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    carteiras = db.scalars(select(Carteira).where(Carteira.usuario_id == current_user.id)).all()
    if not carteiras:
        return PatrimonioGeralOut(saldo_caixa_total=0, valor_investido_total=0, patrimonio_total=0, rentabilidade_total_pct=0)

    saldo_caixa_total = sum(float(c.saldo_caixa) for c in carteiras)
    capital_inicial_total = sum(float(c.capital_inicial) for c in carteiras)
    
    valor_investido_total = 0.0

    for cart in carteiras:
        operacoes = db.scalars(select(OperacaoSimulada).where(OperacaoSimulada.carteira_id == cart.id)).all()
        posicoes = {}
        
        for op in operacoes:
            if op.ativo_id not in posicoes:
                posicoes[op.ativo_id] = Decimal("0")
            
            if op.tipo == "COMPRA":
                posicoes[op.ativo_id] += op.quantidade
            else:
                posicoes[op.ativo_id] -= op.quantidade
                
        for ativo_id, qtd in posicoes.items():
            if qtd > 0:
                cotacao = db.scalar(
                    select(Cotacao).where(Cotacao.ativo_id == ativo_id).order_by(Cotacao.data.desc()).limit(1)
                )
                if cotacao and cotacao.fechamento:
                    valor_investido_total += float(qtd) * float(cotacao.fechamento)

    patrimonio_total = saldo_caixa_total + valor_investido_total
    rentabilidade_total_pct = ((patrimonio_total - capital_inicial_total) / capital_inicial_total * 100) if capital_inicial_total > 0 else 0

    return PatrimonioGeralOut(
        saldo_caixa_total=round(saldo_caixa_total, 2),
        valor_investido_total=round(valor_investido_total, 2),
        patrimonio_total=round(patrimonio_total, 2),
        rentabilidade_total_pct=round(rentabilidade_total_pct, 2)
    )