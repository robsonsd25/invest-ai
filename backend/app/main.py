"""
INVEST AI - Backend FastAPI.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    analises, ativos, auth, carteiras, health, indicadores, mercados, 
    perfis, simulador, posicoes, cotacoes, radar, extrato, noticias
)

app = FastAPI(
    title="INVEST AI",
    description="Plataforma de inteligencia e analise de investimentos",
    version="1.0.0",
)

# Para producao inicial, liberamos todos. Depois podemos restringir.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False, # Precisa ser False se origins for "*"
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", tags=["sistema"])
def inicio():
    return {"projeto": "INVEST AI", "status": "online"}

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