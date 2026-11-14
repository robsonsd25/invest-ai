"""
Funcoes de seguranca: hash de senha e geracao/validacao de token JWT.
"""
import os
from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext

# Em producao, a chave vem das variaveis de ambiente. Em dev, usa o padrao.
SECRET_KEY = os.getenv("SECRET_KEY", "invest-ai-secret-key-super-segura-mudar-em-producao")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 dias

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def verificar_senha(senha_plana: str, senha_hash: str) -> bool:
    return pwd_context.verify(senha_plana, senha_hash)

def gerar_hash_senha(senha: str) -> str:
    return pwd_context.hash(senha)

def criar_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt