"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCarteiras, getRadar, getPatrimonioGeral, getFavoritos, Carteira, RadarResultado, PatrimonioGeral, Favorito, getToken, removeToken } from "@/lib/api";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Dashboard() {
  const router = useRouter();
  const [carteiras, setCarteiras] = useState<Carteira[]>([]);
  const [radar, setRadar] = useState<RadarResultado | null>(null);
  const [patrimonio, setPatrimonio] = useState<PatrimonioGeral | null>(null);
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }

    async function carregar() {
      try {
        const [c, r, p, f] = await Promise.all([getCarteiras(), getRadar(), getPatrimonioGeral(), getFavoritos()]);
        setCarteiras(c); setRadar(r); setPatrimonio(p); setFavoritos(f);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    }
    carregar();
  }, [router]);

  function handleLogout() { removeToken(); router.push("/login"); }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-white p-4 md:p-8 transition-colors">
      <header className="mb-8 border-b border-gray-200 dark:border-gray-800 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">INVEST <span className="text-emerald-600 dark:text-emerald-500">AI</span></h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Plataforma de inteligência e análise</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <ThemeToggle />
          <Link href="/noticias" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-100 px-3 py-2 rounded-lg text-sm font-semibold transition-colors">📰 Notícias</Link>
          <Link href="/radar" className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-100 px-3 py-2 rounded-lg text-sm font-semibold transition-colors">🏆 Radar</Link>
          <Link href="/analise" className="bg-gray-200 dark:bg-gray-800 px-3 py-2 rounded-lg text-sm transition-colors">Análise &rarr;</Link>
          <Link href="/perfil" className="bg-gray-200 dark:bg-gray-800 px-3 py-2 rounded-lg text-sm transition-colors">👤 Perfil</Link>
          <button onClick={handleLogout} className="text-red-500 px-2 py-2 text-sm font-semibold">Sair</button>
        </div>
      </header>

      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-32 bg-gray-200 dark:bg-gray-900 rounded-xl"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-900 rounded-xl"></div>
        </div>
      ) : (
        <>
          {patrimonio && (
            <section className="mb-10">
              <div className="bg-white dark:bg-gradient-to-r dark:from-gray-900 dark:to-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
                <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">Patrimônio Total Consolidado</p>
                <h2 className="text-4xl md:text-5xl font-black tabular-nums mb-4">R$ {patrimonio.patrimonio_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</h2>
                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-gray-400"></span><span className="text-gray-500">Em Caixa:</span><span className="font-semibold tabular-nums">R$ {patrimonio.saldo_caixa_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-gray-500">Investido:</span><span className="font-semibold tabular-nums">R$ {patrimonio.valor_investido_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></div>
                </div>
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            <section className="lg:col-span-2">
              <h2 className="text-xl font-semibold mb-4">Top Oportunidades do Dia</h2>
              {radar && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
                    <h3 className="text-emerald-600 dark:text-emerald-500 font-bold mb-4 flex items-center gap-2">🚀 Compras</h3>
                    <div className="space-y-3">
                      {radar.compra.slice(0, 3).map((item, index) => (
                        <Link key={item.ticker} href={`/analise?ticker=${item.ticker}`} className="flex justify-between items-center bg-gray-50 dark:bg-gray-950 p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-emerald-500/50 transition-colors">
                          <div className="flex items-center gap-3"><span className="text-gray-400 font-bold">#{index + 1}</span><div><p className="font-bold">{item.ticker}</p></div></div>
                          <div className="text-right"><p className="font-semibold tabular-nums">R$ {item.fechamento.toFixed(2)}</p><p className="text-xs text-emerald-500">RSI: {item.rsi_14?.toFixed(1)}</p></div>
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
                    <h3 className="text-red-500 font-bold mb-4 flex items-center gap-2">⚠️ Vendas</h3>
                    <div className="space-y-3">
                      {radar.venda.slice(0, 3).map((item, index) => (
                        <Link key={item.ticker} href={`/analise?ticker=${item.ticker}`} className="flex justify-between items-center bg-gray-50 dark:bg-gray-950 p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-red-500/50 transition-colors">
                          <div className="flex items-center gap-3"><span className="text-gray-400 font-bold">#{index + 1}</span><div><p className="font-bold">{item.ticker}</p></div></div>
                          <div className="text-right"><p className="font-semibold tabular-nums">R$ {item.fechamento.toFixed(2)}</p><p className="text-xs text-red-500">RSI: {item.rsi_14?.toFixed(1)}</p></div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">⭐ Meus Favoritos</h2>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm h-full max-h-[320px] overflow-y-auto">
                {favoritos.length === 0 ? (
                  <p className="text-sm text-gray-500 italic text-center py-8">Você ainda não favoritou nenhum ativo.<br/>Vá na tela de Análise e clique na estrela!</p>
                ) : (
                  <div className="space-y-3">
                    {favoritos.map(fav => (
                      <Link key={fav.ativo_id} href={`/analise?ticker=${fav.ticker}`} className="block bg-gray-50 dark:bg-gray-950 p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-yellow-500/50 transition-colors">
                        <div className="flex justify-between items-center">
                          <div><p className="font-bold">{fav.ticker}</p><p className="text-xs text-gray-500 truncate max-w-[120px]">{fav.nome}</p></div>
                          <p className="font-semibold tabular-nums">R$ {fav.preco_atual.toFixed(2)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          <section>
            <h2 className="text-xl font-semibold mb-4">Minhas Carteiras Virtuais</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {carteiras.map((c) => (
                <Link href={`/carteira/${c.id}`} key={c.id}>
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:border-emerald-500/50 transition-all cursor-pointer h-full shadow-sm">
                    <h3 className="text-lg font-medium">{c.nome}</h3>
                    <div className="mt-6">
                      <p className="text-sm text-gray-500">Saldo em Caixa</p>
                      <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">R$ {parseFloat(c.saldo_caixa).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
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