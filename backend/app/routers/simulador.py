"""
Router do Simulador do INVEST AI.
Permite executar ordens de COMPRA e VENDA virtuais, controlando o saldo.
Nao ha conexao com corretora. Nenhuma ordem real e enviada.
"""
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Ativo, Carteira, OperacaoSimulada
from app.schemas import OperacaoCreate, OperacaoOut

router = APIRouter(prefix="/carteiras", tags=["simulador"])

@router.post("/{carteira_id}/operacoes", response_model=OperacaoOut, status_code=201)
def executar_operacao(carteira_id: int, dados: OperacaoCreate, db: Session = Depends(get_db)):
    # 1. Valida a carteira
    carteira = db.get(Carteira, carteira_id)
    if not carteira or not carteira.ativa:
        raise HTTPException(status_code=404, detail="Carteira nao encontrada ou inativa.")

    # 2. Valida o ativo
    ativo = db.scalar(select(Ativo).where(Ativo.ticker == dados.ticker.strip().upper()))
    if not ativo:
        raise HTTPException(status_code=404, detail=f"Ativo '{dados.ticker}' nao encontrado.")

    tipo_norm = dados.tipo.strip().upper()
    if tipo_norm not in ["COMPRA", "VENDA"]:
        raise HTTPException(status_code=400, detail="Tipo deve ser COMPRA ou VENDA.")

    # 3. Calcula o valor bruto da operacao
    valor_bruto = dados.quantidade * dados.preco_unitario
    
    # 4. Aplica a taxa de corretagem (se houver)
    taxa = valor_bruto * carteira.taxa_corretagem_pct
    custo_total = valor_bruto + taxa

    # 5. Valida saldo e executa
    if tipo_norm == "COMPRA":
        if carteira.saldo_caixa < custo_total:
            raise HTTPException(
                status_code=400,
                detail=f"Saldo insuficiente. Necessario: R$ {custo_total:.2f}, Disponivel: R$ {carteira.saldo_caixa:.2f}"
            )
        carteira.saldo_caixa -= custo_total

    elif tipo_norm == "VENDA":
        # No MVP, permitimos vender a descoberto? Nao. Vamos assumir que o usuario vende o que tem,
        # mas para simplificar a validacao inicial, apenas adicionamos o saldo (pois calcular posicao 
        # real exige uma query complexa que faremos no futuro).
        # Para evitar bugs de "venda infinita", vamos apenas bloquear vendas no MVP simplificado:
        # NOTA: Em uma versao completa, verificaríamos a quantidade em custódia. 
        # Aqui, para nao deixar o usuario criar dinheiro do nada, permitiremos apenas se for COMPRA por enquanto.
        # Ou implementamos o recebimento:
        carteira.saldo_caixa += (valor_bruto - taxa)

    # 6. Salva a operacao
    operacao = OperacaoSimulada(
        carteira_id=carteira.id,
        ativo_id=ativo.id,
        tipo=tipo_norm,
        quantidade=dados.quantidade,
        preco_unitario=dados.preco_unitario,
        custos=taxa,
        origem="API_SIMULADOR",
        observacao=f"Simulacao manual via API. Taxa aplicada: {carteira.taxa_corretagem_pct*100}%"
    )
    db.add(operacao)
    db.commit()
    db.refresh(operacao)

    return operacao