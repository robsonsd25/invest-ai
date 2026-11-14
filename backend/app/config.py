"""
Configuracao central do INVEST AI.
Le do .env e valida na inicializacao - falha cedo se faltar algo.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "invest_ai"
    DB_USER: str = "postgres"
    DB_PASSWORD: str


settings = Settings()