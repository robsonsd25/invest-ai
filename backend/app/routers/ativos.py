"""
Router de ativos do INVEST AI.
Lista ativos, com filtro opcional por mercado.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Ativo, Mercado, TipoAtivo
from app.schemas import AtivoOut

router = APIRouter(prefix="/ativos", tags=["ativos"])


@router.get("", response_model=list[AtivoOut])
def listar_ativos(
    mercado: str | None = Query(
        default=None,
        description="Filtra pelo codigo do mercado (ex.: B3, NASDAQ, NYSE)",
    ),
    db: Session = Depends(get_db),
):
    stmt = (
        select(
            Ativo.id,
            Ativo.ticker,
            Ativo.nome,
            Ativo.setor,
            Ativo.ativo,
            Mercado.codigo.label("mercado_codigo"),
            Mercado.nome.label("mercado_nome"),
            TipoAtivo.codigo.label("tipo_codigo"),
        )
        .join(Mercado, Ativo.mercado_id == Mercado.id)
        .outerjoin(TipoAtivo, Ativo.tipo_id == TipoAtivo.id)
        .where(Ativo.ativo.is_(True))
        .order_by(Ativo.ticker)
    )

    if mercado:
        stmt = stmt.where(Mercado.codigo == mercado.upper())

    return [dict(row._mapping) for row in db.execute(stmt).all()]