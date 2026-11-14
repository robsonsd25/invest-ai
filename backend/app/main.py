"""
INVEST AI - Backend FastAPI.
Fase: analise e simulacao. Sem ordens reais, sem alavancagem.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    analises, ativos, carteiras, health, indicadores, mercados, perfis, simulador, posicoes, cotacoes
)

app = FastAPI(
    title="INVEST AI",
    description="Plataforma de inteligencia e analise de investimentos",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", tags=["sistema"])
def inicio():
    return {
        "projeto": "INVEST AI",
        "status": "online",
        "mensagem": "Bem-vindo a plataforma INVEST AI",
        "modo": "analise e simulacao",
    }

app.include_router(health.router)
app.include_router(mercados.router)
app.include_router(perfis.router)
app.include_router(ativos.router)
app.include_router(indicadores.router)
app.include_router(analises.router)
app.include_router(cotacoes.router)
app.include_router(carteiras.router)
app.include_router(simulador.router)
app.include_router(posicoes.router)