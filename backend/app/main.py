"""
INVEST AI - Backend FastAPI.
Fase: analise e simulacao. Sem ordens reais, sem alavancagem.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    analises, ativos, auth, carteiras, cotacoes, extrato, favoritos,
    health, indicadores, mercados, noticias, perfis, posicoes, radar, simulador,
)

app = FastAPI(
    title="INVEST AI",
    description="Plataforma de inteligencia e analise de investimentos",
    version="1.0.0",
)

# Em app/main.py

app.add_middleware(
    CORSMiddleware,
    # Lista explícita de origens permitidas.
    allow_origins=[
        "http://localhost:3000",      # Para desenvolvimento local
        "http://127.0.0.1:3000",      # Para desenvolvimento local
        "https://invest-ai-livid.vercel.app"  # <-- SUA URL DA VERCEL AQUI
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/", tags=["sistema"])
def inicio():
    return {"projeto": "INVEST AI", "status": "online", "modo": "analise e simulacao"}

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(mercados.router)
app.include_router(perfis.router)
app.include_router(ativos.router)
app.include_router(indicadores.router)
app.include_router(analises.router)
app.include_router(cotacoes.router)
app.include_router(radar.router)
app.include_router(noticias.router)
app.include_router(carteiras.router)
app.include_router(simulador.router)
app.include_router(posicoes.router)
app.include_router(extrato.router)
app.include_router(favoritos.router)