"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCarteiras, getRadar, Carteira, RadarResultado, getToken, removeToken } from "@/lib/api";
import Link from "next/link";

export default function Dashboard() {
  const router = useRouter();
  const [carteiras, setCarteiras] = useState<Carteira[]>([]);
  const [radar, setRadar] = useState<RadarResultado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    async function carregarDados() {
      try {
        const [dataCarteiras, dataRadar] = await Promise.all([
          getCarteiras(),
          getRadar()
        ]);
        setCarteiras(dataCarteiras);
        setRadar(dataRadar);
      } catch (err: any) {
        setError(err.message || "Erro ao conectar com o servidor.");
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, [router]);

  function handleLogout() {
    removeToken();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <header className="mb-8 border-b border-gray-800 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            INVEST <span className="text-emerald-500">AI</span>
          </h1>
          <p className="text-gray-400 mt-1">
            Plataforma de inteligência e análise de investimentos
          </p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3 items-center">
          <Link href="/noticias" className="bg-blue-900 hover:bg-blue-800 text-blue-100 px-3 py-2 md:px-4 rounded-lg text-sm transition-colors border border-blue-700 font-semibold">📰 Notícias</Link>
          <Link href="/radar" className="bg-purple-900 hover:bg-purple-800 text-purple-100 px-3 py-2 md:px-4 rounded-lg text-sm transition-colors border border-purple-700 font-semibold">🏆 Radar Completo</Link>
          <Link href="/analise" className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 md:px-4 rounded-lg text-sm transition-colors border border-gray-700">Análise &rarr;</Link>
          <Link href="/perfil" className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 md:px-4 rounded-lg text-sm transition-colors border border-gray-700">👤 Perfil</Link>
          <button onClick={handleLogout} className="text-red-400 hover:text-red-300 px-2 py-2 text-sm font-semibold transition-colors ml-1 md:ml-2">Sair</button>
        </div>
      </header>

      {error && <div className="bg-red-900/50 text-red-400 p-4 rounded-xl mb-6">{error}</div>}

      {loading ? (
        <div className="space-y-8 animate-pulse">
          {/* Skeleton do Top Oportunidades */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-900 border border-gray-800 rounded-xl"></div>
            <div className="h-64 bg-gray-900 border border-gray-800 rounded-xl"></div>
          </div>
          {/* Skeleton das Carteiras */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-52 bg-gray-900 border border-gray-800 rounded-xl"></div>)}
          </div>
        </div>
      ) : (
        <>
          {/* TOP OPORTUNIDADES */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold mb-6 text-gray-300">Top Oportunidades do Dia</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* TOP COMPRAS */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-emerald-500 font-bold mb-4 flex items-center gap-2">
                  <span className="bg-emerald-900/50 p-1.5 rounded text-sm">🚀</span> Melhores para Compra (RSI Baixo)
                </h3>
                <div className="space-y-3">
                  {radar?.compra.slice(0, 3).map((item, index) => (
                    <Link key={item.ticker} href={`/analise?ticker=${item.ticker}`} className="flex justify-between items-center bg-gray-950 p-3 rounded-lg border border-gray-800 hover:border-emerald-500/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 font-bold text-lg w-4">#{index + 1}</span>
                        <div>
                          <p className="font-bold text-gray-100">{item.ticker}</p>
                          <p className="text-xs text-gray-500">{item.mercado}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold tabular-nums">R$ {item.fechamento.toFixed(2)}</p>
                        <p className="text-xs text-emerald-400 font-medium">RSI: {item.rsi_14?.toFixed(1)}</p>
                      </div>
                    </Link>
                  ))}
                  {radar?.compra.length === 0 && <p className="text-sm text-gray-500">Nenhuma oportunidade no momento.</p>}
                </div>
              </div>

              {/* TOP VENDAS */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-red-500 font-bold mb-4 flex items-center gap-2">
                  <span className="bg-red-900/50 p-1.5 rounded text-sm">⚠️</span> Alertas de Venda (RSI Alto)
                </h3>
                <div className="space-y-3">
                  {radar?.venda.slice(0, 3).map((item, index) => (
                    <Link key={item.ticker} href={`/analise?ticker=${item.ticker}`} className="flex justify-between items-center bg-gray-950 p-3 rounded-lg border border-gray-800 hover:border-red-500/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 font-bold text-lg w-4">#{index + 1}</span>
                        <div>
                          <p className="font-bold text-gray-100">{item.ticker}</p>
                          <p className="text-xs text-gray-500">{item.mercado}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold tabular-nums">R$ {item.fechamento.toFixed(2)}</p>
                        <p className="text-xs text-red-400 font-medium">RSI: {item.rsi_14?.toFixed(1)}</p>
                      </div>
                    </Link>
                  ))}
                  {radar?.venda.length === 0 && <p className="text-sm text-gray-500">Nenhum alerta no momento.</p>}
                </div>
              </div>

            </div>
          </section>

          {/* CARTEIRAS VIRTUAIS */}
          <section>
            <h2 className="text-xl font-semibold mb-6 text-gray-300">Minhas Carteiras Virtuais</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {carteiras.map((carteira) => (
                <Link href={`/carteira/${carteira.id}`} key={carteira.id}>
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg hover:border-emerald-500/50 hover:bg-gray-800 transition-all cursor-pointer block h-full">
                    <h3 className="text-lg font-medium text-gray-100">{carteira.nome}</h3>
                    <p className="text-sm text-gray-500 mt-1">ID: #{carteira.id}</p>
                    <div className="mt-6">
                      <p className="text-sm text-gray-400">Saldo em Caixa</p>
                      <p className="text-3xl font-bold text-emerald-400 mt-1 tabular-nums">
                        R$ {parseFloat(carteira.saldo_caixa).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="mt-4 flex justify-between text-sm text-gray-500">
                      <span>Capital Inicial:</span>
                      <span className="tabular-nums">R$ {parseFloat(carteira.capital_inicial).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}