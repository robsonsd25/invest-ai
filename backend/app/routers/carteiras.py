"""
Router de carteiras do INVEST AI.
Lista as carteiras do usuario logado.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Carteira, Usuario
from app.schemas import CarteiraOut
from app.routers.auth import get_current_user

router = APIRouter(prefix="/carteiras", tags=["carteiras"])

@router.get("", response_model=list[CarteiraOut])
def listar_carteiras(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    # Filtra apenas as carteiras que pertencem ao usuario logado
    stmt = (
        select(Carteira)
        .where(Carteira.usuario_id == current_user.id)
        .order_by(Carteira.id)
    )
    return list(db.scalars(stmt).all())