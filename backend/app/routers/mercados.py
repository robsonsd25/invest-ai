"""
Router de mercados do INVEST AI.
Lista os mercados ativos (B3, NYSE, NASDAQ).
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Mercado
from app.schemas import MercadoOut

router = APIRouter(prefix="/mercados", tags=["referencia"])


@router.get("", response_model=list[MercadoOut])
def listar_mercados(db: Session = Depends(get_db)):
    stmt = select(Mercado).where(Mercado.ativo.is_(True)).order_by(Mercado.id)
    return list(db.scalars(stmt).all())