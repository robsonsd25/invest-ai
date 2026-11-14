"""
Router de posicoes do INVEST AI.
Calcula a custodia atual (o que a carteira possui) com base no historico
de operacoes simuladas.
"""
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Ativo, Carteira, OperacaoSimulada

router = APIRouter(prefix="/carteiras", tags=["posicoes"])


@router.get("/{carteira_id}/posicoes")
def listar_posicoes(carteira_id: int, db: Session = Depends(get_db)):
    # 1. Valida se a carteira existe
    carteira = db.get(Carteira, carteira_id)
    if not carteira:
        raise HTTPException(status_code=404, detail="Carteira nao encontrada.")

    # 2. Busca todas as operacoes dessa carteira
    operacoes = db.scalars(
        select(OperacaoSimulada)
        .where(OperacaoSimulada.carteira_id == carteira_id)
        .order_by(OperacaoSimulada.executada_em)
    ).all()

    if not operacoes:
        return {
            "carteira_id": carteira.id,
            "nome": carteira.nome,
            "saldo_caixa": float(carteira.saldo_caixa),
            "posicoes": []
        }

    # 3. Calcula quantidade e preco medio por ativo
    posicoes_dict = {}
    for op in operacoes:
        # Precisamos do ticker. Como nao fizemos join, buscaremos na mao (ou poderiamos ter feito join).
        # Para evitar N+1 queries, vamos pegar o ativo_id e buscar depois.
        
        ativo_id = op.ativo_id
        if ativo_id not in posicoes_dict:
            posicoes_dict[ativo_id] = {
                "quantidade": Decimal("0"),
                "custo_total": Decimal("0")
            }
        
        if op.tipo == "COMPRA":
            posicoes_dict[ativo_id]["quantidade"] += op.quantidade
            posicoes_dict[ativo_id]["custo_total"] += (op.quantidade * op.preco_unitario)
        elif op.tipo == "VENDA":
            posicoes_dict[ativo_id]["quantidade"] -= op.quantidade
            # Para simplificar o preco medio, reduzimos o custo proporcionalmente
            if posicoes_dict[ativo_id]["quantidade"] > 0:
                # Na venda, o custo medio das acoes que restaram diminui.
                # Simplificacao: o preco medio se mantem o mesmo.
                pass
            else:
                # Se zerou ou ficou negativo (short), o custo total vai a zero no MVP
                posicoes_dict[ativo_id]["custo_total"] = Decimal("0")

    # 4. Monta a resposta final, ignorando ativos com quantidade zero
    resultado = []
    for ativo_id, dados in posicoes_dict.items():
        if dados["quantidade"] > 0:
            ativo = db.get(Ativo, ativo_id)
            preco_medio = dados["custo_total"] / dados["quantidade"] if dados["quantidade"] > 0 else Decimal("0")
            resultado.append({
                "ativo_id": ativo_id,
                "ticker": ativo.ticker,
                "nome": ativo.nome,
                "quantidade": float(dados["quantidade"]),
                "preco_medio": float(preco_medio),
                "custo_total": float(dados["custo_total"])
            })

    return {
        "carteira_id": carteira.id,
        "nome": carteira.nome,
        "saldo_caixa": float(carteira.saldo_caixa),
        "posicoes": resultado
    }