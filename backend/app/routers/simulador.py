"""
Router do Simulador do INVEST AI.
"""
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Ativo, Carteira, OperacaoSimulada, PerfilRisco, Usuario
from app.schemas import OperacaoCreate, OperacaoOut
from app.routers.auth import get_current_user

router = APIRouter(prefix="/carteiras", tags=["simulador"])

@router.post("/{carteira_id}/operacoes", response_model=OperacaoOut, status_code=201)
def executar_operacao(
    carteira_id: int, 
    dados: OperacaoCreate, 
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    carteira = db.get(Carteira, carteira_id)
    if not carteira or not carteira.ativa or carteira.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="Acesso negado ou carteira inativa.")

    ativo = db.scalar(select(Ativo).where(Ativo.ticker == dados.ticker.strip().upper()))
    if not ativo:
        raise HTTPException(status_code=404, detail=f"Ativo '{dados.ticker}' nao encontrado.")

    tipo_norm = dados.tipo.strip().upper()
    if tipo_norm not in ["COMPRA", "VENDA"]:
        raise HTTPException(status_code=400, detail="Tipo deve ser COMPRA ou VENDA.")

    valor_bruto = dados.quantidade * dados.preco_unitario
    taxa = valor_bruto * carteira.taxa_corretagem_pct
    custo_total = valor_bruto + taxa

    if tipo_norm == "COMPRA":
        # --- TRAVA DE GESTAO DE RISCO ---
        perfil = db.get(PerfilRisco, carteira.perfil_id)
        
        # Calcula o custo atual de todas as posições abertas
        operacoes = db.scalars(
            select(OperacaoSimulada).where(OperacaoSimulada.carteira_id == carteira.id)
        ).all()
        
        custo_investido_atual = Decimal("0")
        for op in operacoes:
            if op.tipo == "COMPRA":
                custo_investido_atual += (op.quantidade * op.preco_unitario)
            elif op.tipo == "VENDA":
                custo_investido_atual -= (op.quantidade * op.preco_unitario)

        custo_investido_atual = max(custo_investido_atual, Decimal("0"))
        
        # Limite máximo permitido (ex: 40% do capital inicial)
        limite_maximo = carteira.capital_inicial * (perfil.max_exposicao_pct / Decimal("100"))
        
        if (custo_investido_atual + custo_total) > limite_maximo:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Limite de exposição excedido para o perfil {perfil.nome}. "
                    f"Permitido: R$ {limite_maximo:.2f} ({perfil.max_exposicao_pct}%), "
                    f"Já investido: R$ {custo_investido_atual:.2f}, "
                    f"Nova operação: R$ {custo_total:.2f}."
                )
            )
        # --------------------------------

        if carteira.saldo_caixa < custo_total:
            raise HTTPException(
                status_code=400,
                detail=f"Saldo insuficiente. Necessario: R$ {custo_total:.2f}, Disponivel: R$ {carteira.saldo_caixa:.2f}"
            )
        carteira.saldo_caixa -= custo_total
        
    elif tipo_norm == "VENDA":
        carteira.saldo_caixa += (valor_bruto - taxa)

    operacao = OperacaoSimulada(
        carteira_id=carteira.id,
        ativo_id=ativo.id,
        tipo=tipo_norm,
        quantidade=dados.quantidade,
        preco_unitario=dados.preco_unitario,
        custos=taxa,
        origem="API_SIMULADOR",
        observacao=f"Simulacao via API."
    )
    db.add(operacao)
    db.commit()
    db.refresh(operacao)

    return operacao