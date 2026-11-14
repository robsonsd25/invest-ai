"""
Importador de noticias via RSS.
Puxa as ultimas noticias do mercado financeiro e salva no banco.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import feedparser  # noqa: E402
from datetime import datetime  # noqa: E402
from email.utils import parsedate_to_datetime  # noqa: E402

from sqlalchemy import select  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.models import Fonte, Noticia  # noqa: E402

# URL do RSS do Google News para mercado financeiro no Brasil
RSS_URL = "https://news.google.com/rss/search?q=mercado+financeiro&hl=pt-BR&gl=BR&ceid=BR:pt-419"

def run():
    db = SessionLocal()
    try:
        # 1. Garante que a fonte existe
        fonte = db.scalar(select(Fonte).where(Fonte.nome == "Google News - Mercado"))
        if not fonte:
            fonte = Fonte(nome="Google News - Mercado", url="https://news.google.com", tipo="RSS")
            db.add(fonte)
            db.flush()

        # 2. Le o feed RSS
        print("Baixando noticias...")
        feed = feedparser.parse(RSS_URL)
        
        inseridas = 0
        for entry in feed.entries:
            # Verifica se a noticia ja esta no banco pelo link (URL unica)
            url = entry.link
            if db.scalar(select(Noticia).where(Noticia.url == url)):
                continue

            # Converte a data do RSS para datetime do Python
            try:
                publicado_em = parsedate_to_datetime(entry.published)
            except Exception:
                publicado_em = datetime.now()

            # Limpa o titulo (o Google News coloca o nome do jornal no final)
            titulo = entry.title
            if " - " in titulo:
                titulo = titulo.rsplit(" - ", 1)[0]

            nova_noticia = Noticia(
                fonte_id=fonte.id,
                titulo=titulo,
                url=url,
                resumo=entry.get("summary", ""),
                publicado_em=publicado_em
            )
            db.add(nova_noticia)
            inseridas += 1

        db.commit()
        print(f"Importacao concluida. {inseridas} novas noticias inseridas.")

    except Exception as e:
        db.rollback()
        print(f"Erro ao importar: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run()