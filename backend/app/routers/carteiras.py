"""
Router de carteiras do INVEST AI.
Lista as carteiras simuladas.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Carteira
from app.schemas import CarteiraOut

router = APIRouter(prefix="/carteiras", tags=["carteiras"])


@router.get("", response_model=list[CarteiraOut])
def listar_carteiras(db: Session = Depends(get_db)):
    stmt = select(Carteira).order_by(Carteira.id)
    return list(db.scalars(stmt).all())