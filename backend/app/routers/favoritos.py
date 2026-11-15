from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Favorito, Ativo, Cotacao, Usuario
from app.schemas import FavoritoOut
from app.routers.auth import get_current_user

router = APIRouter(prefix="/favoritos", tags=["favoritos"])

@router.get("", response_model=List[FavoritoOut])
def listar_favoritos(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    stmt = (
        select(Ativo)
        .join(Favorito, Favorito.ativo_id == Ativo.id)
        .where(Favorito.usuario_id == current_user.id)
    )
    ativos = db.scalars(stmt).all()
    
    resultado = []
    for ativo in ativos:
        cotacao = db.scalar(select(Cotacao).where(Cotacao.ativo_id == ativo.id).order_by(Cotacao.data.desc()).limit(1))
        preco = float(cotacao.fechamento) if cotacao and cotacao.fechamento else 0.0
        resultado.append(FavoritoOut(ativo_id=ativo.id, ticker=ativo.ticker, nome=ativo.nome, preco_atual=preco))
    return resultado

@router.post("/{ticker}", status_code=201)
def adicionar_favorito(ticker: str, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    ativo = db.scalar(select(Ativo).where(Ativo.ticker == ticker.strip().upper()))
    if not ativo:
        raise HTTPException(status_code=404, detail="Ativo não encontrado.")
    
    existe = db.scalar(select(Favorito).where(Favorito.usuario_id == current_user.id, Favorito.ativo_id == ativo.id))
    if not existe:
        db.add(Favorito(usuario_id=current_user.id, ativo_id=ativo.id))
        db.commit()
    return {"mensagem": "Adicionado aos favoritos."}

@router.delete("/{ticker}", status_code=200)
def remover_favorito(ticker: str, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    ativo = db.scalar(select(Ativo).where(Ativo.ticker == ticker.strip().upper()))
    if ativo:
        favorito = db.scalar(select(Favorito).where(Favorito.usuario_id == current_user.id, Favorito.ativo_id == ativo.id))
        if favorito:
            db.delete(favorito)
            db.commit()
    return {"mensagem": "Removido dos favoritos."}