"""
Router de perfis de risco do INVEST AI.
Lista os perfis Conservador, Moderado e Agressivo.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PerfilRisco
from app.schemas import PerfilRiscoOut

router = APIRouter(prefix="/perfis", tags=["referencia"])


@router.get("", response_model=list[PerfilRiscoOut])
def listar_perfis(db: Session = Depends(get_db)):
    stmt = select(PerfilRisco).order_by(PerfilRisco.id)
    return list(db.scalars(stmt).all())