"""
Router de health check do INVEST AI.
Verifica se o backend e o banco estao operacionais.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import HealthResponse

router = APIRouter(tags=["sistema"])


@router.get("/health", response_model=HealthResponse)
def verificar_saude(db: Session = Depends(get_db)):
    """Verifica a saude do backend e do banco."""
    try:
        row = db.execute(
            text("SELECT version() AS versao, current_database() AS banco")
        ).mappings().one()
        return {
            "status": "healthy",
            "backend": "operacional",
            "banco": "operacional",
            "database": row["banco"],
            "postgres": row["versao"].split(",")[0],
        }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Banco indisponivel: {e}",
        )