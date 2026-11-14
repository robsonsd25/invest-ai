"""
Router de Noticias.
Lista as noticias mais recentes salvas no banco.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Fonte, Noticia
from app.schemas import NoticiaOut

router = APIRouter(prefix="/noticias", tags=["noticias"])

@router.get("", response_model=List[NoticiaOut])
def listar_noticias(db: Session = Depends(get_db)):
    # Busca as 50 noticias mais recentes
    stmt = (
        select(Noticia, Fonte.nome)
        .outerjoin(Fonte, Noticia.fonte_id == Fonte.id)
        .order_by(Noticia.publicado_em.desc())
        .limit(50)
    )
    resultados = db.execute(stmt).all()

    noticias = []
    for noticia, fonte_nome in resultados:
        noticias.append(
            NoticiaOut(
                id=noticia.id,
                titulo=noticia.titulo,
                url=noticia.url,
                resumo=noticia.resumo,
                publicado_em=noticia.publicado_em,
                fonte_nome=fonte_nome
            )
        )
    return noticias