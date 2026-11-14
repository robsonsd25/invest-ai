"use client";

import { useEffect, useState } from "react";
import { getNoticias, Noticia } from "@/lib/api";
import Link from "next/link";

export default function NoticiasPage() {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      try {
        const data = await getNoticias();
        setNoticias(data);
      } catch (err: any) {
        setError(err.message || "Erro ao carregar notícias.");
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="animate-pulse text-xl">Carregando notícias do mercado...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-red-500 flex items-center justify-center">
        <p>Erro: {error}. O backend está rodando?</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <header className="mb-8 border-b border-gray-800 pb-4">
        <Link href="/" className="text-emerald-500 hover:underline text-sm mb-2 inline-block">
          &larr; Voltar ao Dashboard
        </Link>
        <h1 className="text-3xl font-bold">Notícias do Mercado</h1>
        <p className="text-gray-400 mt-1">Últimas atualizações financeiras</p>
      </header>

      {noticias.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p>Nenhuma notícia encontrada no banco.</p>
          <p className="text-sm mt-2">Rode `python app\importador_noticias.py` no backend para importar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {noticias.map((noticia) => (
            <a 
              key={noticia.id} 
              href={noticia.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-emerald-500/50 hover:bg-gray-800/50 transition-all flex flex-col group"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-semibold text-emerald-500 bg-emerald-900/30 px-2 py-1 rounded">
                  {noticia.fonte_nome || "Notícia"}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(noticia.publicado_em).toLocaleDateString("pt-BR")}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-gray-100 mb-2 line-clamp-3 group-hover:text-emerald-400 transition-colors">
                {noticia.titulo}
              </h3>
              
              <p className="text-sm text-gray-400 line-clamp-3 mt-auto pt-4 border-t border-gray-800">
                {noticia.resumo?.replace(/<[^>]*>?/gm, '')} {/* Remove tags HTML do resumo */}
              </p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}