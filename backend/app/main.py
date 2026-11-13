
from fastapi import FastAPI

app = FastAPI(
    title="INVEST AI",
    description="Plataforma de inteligência e análise de investimentos",
    version="1.0.0"
)


@app.get("/")
def inicio():
    return {
        "projeto": "INVEST AI",
        "status": "online",
        "mensagem": "Bem-vindo à plataforma INVEST AI"
    }


@app.get("/health")
def verificar_saude():
    return {
        "status": "healthy",
        "backend": "operacional"
    }
