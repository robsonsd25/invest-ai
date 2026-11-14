"""
Router de Autenticacao: Cadastro e Login.
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Usuario, PerfilRisco, Carteira
from app.schemas import UsuarioCreate, UsuarioOut, Token, LoginRequest
from app.core.security import (
    verificar_senha, gerar_hash_senha, criar_access_token, 
    SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter(prefix="/auth", tags=["autenticacao"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

@router.post("/register", response_model=UsuarioOut, status_code=201)
def registrar(usuario: UsuarioCreate, db: Session = Depends(get_db)):
    existe = db.scalar(select(Usuario).where(Usuario.email == usuario.email))
    if existe:
        raise HTTPException(status_code=400, detail="Email ja cadastrado.")

    novo_usuario = Usuario(
        nome=usuario.nome,
        email=usuario.email,
        senha_hash=gerar_hash_senha(usuario.senha)
    )
    db.add(novo_usuario)
    db.flush() # Garante que o usuario_id seja gerado antes de criar as carteiras

    # Cria as 3 carteiras padrao para o novo usuario
    perfis = db.scalars(select(PerfilRisco)).all()
    for perfil in perfis:
        nova_carteira = Carteira(
            usuario_id=novo_usuario.id,
            perfil_id=perfil.id,
            nome=f"Carteira {perfil.nome}",
            capital_inicial=perfil.capital_inicial_brl,
            saldo_caixa=perfil.capital_inicial_brl
        )
        db.add(nova_carteira)

    db.commit()
    db.refresh(novo_usuario)
    return novo_usuario

@router.post("/login", response_model=Token)
def login(dados: LoginRequest, db: Session = Depends(get_db)):
    usuario = db.scalar(select(Usuario).where(Usuario.email == dados.email))
    if not usuario or not verificar_senha(dados.senha, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos."
        )

    access_token = criar_access_token(
        data={"sub": str(usuario.id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": access_token, "token_type": "bearer"}

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalido ou expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    usuario = db.get(Usuario, int(user_id))
    if usuario is None or not usuario.ativo:
        raise credentials_exception
    return usuario