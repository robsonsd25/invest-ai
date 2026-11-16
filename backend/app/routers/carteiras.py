"""
Router de carteiras do INVEST AI.
"""
from datetime import timedelta, date
from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Carteira, OperacaoSimulada, Ativo, Cotacao, Usuario
from app.schemas import CarteiraOut, PatrimonioGeralOut, EvolucaoPatrimonioOut
from app.routers.auth import get_current_user

router = APIRouter(prefix="/carteiras", tags=["carteiras"])

@router.get("", response_model=list[CarteiraOut])
def listar_carteiras(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    stmt = select(Carteira).where(Carteira.usuario_id == current_user.id).order_by(Carteira.id)
    return list(db.scalars(stmt).all())

@router.get("/resumo-geral", response_model=PatrimonioGeralOut)
def resumo_geral(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
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
            posicoes[op.ativo_id] = posicoes.get(op.ativo_id, Decimal("0")) + (op.quantidade if op.tipo == "COMPRA" else -op.quantidade)
        for ativo_id, qtd in posicoes.items():
            if qtd > 0:
                cotacao = db.scalar(select(Cotacao).where(Cotacao.ativo_id == ativo_id).order_by(Cotacao.data.desc()).limit(1))
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

@router.get("/evolucao-patrimonio", response_model=list[EvolucaoPatrimonioOut])
def evolucao_patrimonio(dias: int = 30, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    carteiras = db.scalars(select(Carteira).where(Carteira.usuario_id == current_user.id)).all()
    if not carteiras:
        return []

    # Busca todas as operações do usuário
    carteira_ids = [c.id for c in carteiras]
    operacoes = db.scalars(
        select(OperacaoSimulada)
        .where(OperacaoSimulada.carteira_id.in_(carteira_ids))
        .order_by(OperacaoSimulada.executada_em)
    ).all()

    # Busca a data mais recente de cotação para usar como referência
    ultima_data = db.scalar(select(Cotacao.data).order_by(Cotacao.data.desc()).limit(1))
    if not ultima_data:
        return []
    
    data_inicio = ultima_data - timedelta(days=dias)
    
    # Busca cotações relevantes nesse período
    cotacoes = db.scalars(
        select(Cotacao)
        .where(Cotacao.data >= data_inicio)
        .order_by(Cotacao.data)
    ).all()
    
    # Agrupa cotações por ativo e data para acesso rápido
    precos = {}
    for c in cotacoes:
        if c.ativo_id not in precos:
            precos[c.ativo_id] = {}
        precos[c.ativo_id][c.data] = float(c.fechamento) if c.fechamento else 0.0

    resultado = []
    data_atual = data_inicio

    while data_atual <= ultima_data:
        # 1. Calcula o caixa até a data atual
        caixa = sum(float(c.capital_inicial) for c in carteiras)
        posicoes = {} # {ativo_id: qtd}
        
        for op in operacoes:
            if op.executada_em.date() <= data_atual:
                if op.tipo == "COMPRA":
                    caixa -= float(op.quantidade * op.preco_unitario)
                    posicoes[op.ativo_id] = posicoes.get(op.ativo_id, 0) + float(op.quantidade)
                else:
                    caixa += float(op.quantidade * op.preco_unitario)
                    posicoes[op.ativo_id] = posicoes.get(op.ativo_id, 0) - float(op.quantidade)

        # 2. Calcula o valor investido na data atual
        investido = 0.0
        for ativo_id, qtd in posicoes.items():
            if qtd <= 0:
                continue
            # Pega o preço mais próximo na data (ou o último disponível)
            preco = precos.get(ativo_id, {}).get(data_atual)
            if preco is None:
                # Se não tiver cotação exata nesse dia (fim de semana), pega a última disponível
                datas_disponiveis = sorted([d for d in precos.get(ativo_id, {}).keys() if d <= data_atual], reverse=True)
                if datas_disponiveis:
                    preco = precos[ativo_id][datas_disponiveis[0]]
                else:
                    preco = 0.0
            investido += qtd * preco

        # 3. Adiciona ao resultado (apenas dias úteis)
        if data_atual.weekday() < 5: # 0=segunda, 4=sexta
            resultado.append(EvolucaoPatrimonioOut(
                data=data_atual.strftime("%Y-%m-%d"),
                patrimonio=round(caixa + investido, 2)
            ))

        data_atual += timedelta(days=1)

    return resultado