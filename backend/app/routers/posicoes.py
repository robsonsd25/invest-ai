"""
Router de posicoes do INVEST AI.
Calcula a custodia atual (o que a carteira possui) com base no historico
de operacoes simuladas e calcula o P&L (Lucro/Prejuizo) usando a cotacao mais recente.
"""
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Ativo, Carteira, Cotacao, OperacaoSimulada

router = APIRouter(prefix="/carteiras", tags=["posicoes"])


@router.get("/{carteira_id}/posicoes")
def listar_posicoes(carteira_id: int, db: Session = Depends(get_db)):
    carteira = db.get(Carteira, carteira_id)
    if not carteira:
        raise HTTPException(status_code=404, detail="Carteira nao encontrada.")

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

    posicoes_dict = {}
    for op in operacoes:
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
            if posicoes_dict[ativo_id]["quantidade"] > 0:
                pass
            else:
                posicoes_dict[ativo_id]["custo_total"] = Decimal("0")

    resultado = []
    for ativo_id, dados in posicoes_dict.items():
        if dados["quantidade"] > 0:
            ativo = db.get(Ativo, ativo_id)
            
            # Busca a cotacao mais recente no banco
            cotacao_recente = db.scalar(
                select(Cotacao)
                .where(Cotacao.ativo_id == ativo_id)
                .order_by(Cotacao.data.desc())
                .limit(1)
            )
            
            preco_medio = dados["custo_total"] / dados["quantidade"]
            
            # Se tiver cotacao, usa. Se nao, assume o preco medio para nao quebrar
            preco_atual = float(cotacao_recente.fechamento) if (cotacao_recente and cotacao_recente.fechamento) else float(preco_medio)
            
            valor_atual = float(dados["quantidade"]) * preco_atual
            lucro_prejuizo = valor_atual - float(dados["custo_total"])
            rentabilidade_pct = (lucro_prejuizo / float(dados["custo_total"])) * 100 if dados["custo_total"] > 0 else 0.0

            resultado.append({
                "ativo_id": ativo_id,
                "ticker": ativo.ticker,
                "nome": ativo.nome,
                "quantidade": float(dados["quantidade"]),
                "preco_medio": float(preco_medio),
                "custo_total": float(dados["custo_total"]),
                "preco_atual": preco_atual,
                "valor_atual": valor_atual,
                "lucro_prejuizo": lucro_prejuizo,
                "rentabilidade_pct": rentabilidade_pct
            })

    return {
        "carteira_id": carteira.id,
        "nome": carteira.nome,
        "saldo_caixa": float(carteira.saldo_caixa),
        "posicoes": resultado
    }