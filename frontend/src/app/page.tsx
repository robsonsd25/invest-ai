"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCarteiras, getRadar, getPatrimonioGeral, Carteira, RadarResultado, PatrimonioGeral, getToken, removeToken } from "@/lib/api";
import Link from "next/link";

export default function Dashboard() {
  const router = useRouter();
  const [carteiras, setCarteiras] = useState<Carteira[]>([]);
  const [radar, setRadar] = useState<RadarResultado | null>(null);
  const [patrimonio, setPatrimonio] = useState<PatrimonioGeral | null>(null);
  const [loading, setLoading] = useState(true);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push("/login"); return; }

    async function carregar() {
      // Busca as carteiras
      try {
        const c = await getCarteiras();
        setCarteiras(c);
      } catch (err: any) {
        setErroGeral("Falha ao carregar carteiras: " + err.message);
      }

      // Busca o radar
      try {
        const r = await getRadar();
        setRadar(r);
      } catch (err) {
        console.error("Erro no radar", err);
      }

      // Busca o patrimônio
      try {
        const p = await getPatrimonioGeral();
        setPatrimonio(p);
      } catch (err) {
        console.error("Erro no patrimônio", err);
      }

      setLoading(false);
    }
    carregar();
  }, [router]);

  function handleLogout() { removeToken(); router.push("/login"); }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <header className="mb-8 border-b border-gray-800 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">INVEST <span className="text-emerald-500">AI</span></h1>
          <p className="text-gray-400 mt-1">Plataforma de inteligência e análise</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Link href="/noticias" className="bg-blue-900 hover:bg-blue-800 text-blue-100 px-3 py-2 rounded-lg text-sm border border-blue-700 font-semibold">📰 Notícias</Link>
          <Link href="/radar" className="bg-purple-900 hover:bg-purple-800 text-purple-100 px-3 py-2 rounded-lg text-sm border border-purple-700 font-semibold">🏆 Radar</Link>
          <Link href="/analise" className="bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg text-sm border border-gray-700">Análise &rarr;</Link>
          <Link href="/perfil" className="bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg text-sm border border-gray-700">👤 Perfil</Link>
          <button onClick={handleLogout} className="text-red-400 px-2 py-2 text-sm font-semibold ml-2">Sair</button>
        </div>
      </header>

      {erroGeral && <div className="bg-red-900/50 text-red-400 p-4 rounded-xl mb-6">{erroGeral}</div>}

      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="h-32 bg-gray-900 border border-gray-800 rounded-xl"></div>
          <div className="h-64 bg-gray-900 border border-gray-800 rounded-xl"></div>
          <div className="h-52 bg-gray-900 border border-gray-800 rounded-xl"></div>
        </div>
      ) : (
        <>
          {/* PATRIMONIO GERAL */}
          {patrimonio && (
            <section className="mb-10">
              <div className="bg-gradient-to-r from-gray-900 to-gray-900 border border-gray-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <p className="text-gray-400 font-medium mb-1">Patrimônio Total Consolidado</p>
                <h2 className="text-4xl md:text-5xl font-black text-white tabular-nums mb-4">
                  R$ {patrimonio.patrimonio_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </h2>
                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                    <span className="text-gray-400">Em Caixa:</span>
                    <span className="font-semibold tabular-nums text-gray-200">R$ {patrimonio.saldo_caixa_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-gray-400">Investido:</span>
                    <span className="font-semibold tabular-nums text-gray-200">R$ {patrimonio.valor_investido_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* TOP OPORTUNIDADES */}
          {radar && (
            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4 text-gray-300">Top Oportunidades do Dia</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h3 className="text-emerald-500 font-bold mb-4 flex items-center gap-2"><span className="bg-emerald-900/50 p-1.5 rounded text-sm">🚀</span> Compras</h3>
                  <div className="space-y-3">
                    {radar.compra.slice(0, 3).map((item, index) => (
                      <Link key={item.ticker} href={`/analise?ticker=${item.ticker}`} className="flex justify-between items-center bg-gray-950 p-3 rounded-lg border border-gray-800 hover:border-emerald-500/50 transition-colors">
                        <div className="flex items-center gap-3"><span className="text-gray-500 font-bold text-lg">#{index + 1}</span><div><p className="font-bold text-gray-100">{item.ticker}</p><p className="text-xs text-gray-500">{item.mercado}</p></div></div>
                        <div className="text-right"><p className="font-semibold tabular-nums">R$ {item.fechamento.toFixed(2)}</p><p className="text-xs text-emerald-400 font-medium">RSI: {item.rsi_14?.toFixed(1)}</p></div>
                      </Link>
                    ))}
                    {radar.compra.length === 0 && <p className="text-sm text-gray-500 italic py-2">Nenhum ativo nesta condição.</p>}
                  </div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h3 className="text-red-500 font-bold mb-4 flex items-center gap-2"><span className="bg-red-900/50 p-1.5 rounded text-sm">⚠️</span> Vendas</h3>
                  <div className="space-y-3">
                    {radar.venda.slice(0, 3).map((item, index) => (
                      <Link key={item.ticker} href={`/analise?ticker=${item.ticker}`} className="flex justify-between items-center bg-gray-950 p-3 rounded-lg border border-gray-800 hover:border-red-500/50 transition-colors">
                        <div className="flex items-center gap-3"><span className="text-gray-500 font-bold text-lg">#{index + 1}</span><div><p className="font-bold text-gray-100">{item.ticker}</p><p className="text-xs text-gray-500">{item.mercado}</p></div></div>
                        <div className="text-right"><p className="font-semibold tabular-nums">R$ {item.fechamento.toFixed(2)}</p><p className="text-xs text-red-400 font-medium">RSI: {item.rsi_14?.toFixed(1)}</p></div>
                      </Link>
                    ))}
                    {radar.venda.length === 0 && <p className="text-sm text-gray-500 italic py-2">Nenhum ativo nesta condição.</p>}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* CARTEIRAS */}
          <section>
            <h2 className="text-xl font-semibold mb-4 text-gray-300">Minhas Carteiras Virtuais</h2>
            
            {/* MENSAGEM DE ALERTA CASO ESTEJA VAZIO */}
            {carteiras.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
                <p className="text-gray-400 mb-2">Nenhuma carteira encontrada na sua conta.</p>
                <p className="text-sm text-gray-500">Se você criou a conta antes da última atualização do sistema, sua conta antiga não possui carteiras. Clique em "Sair" e crie uma nova conta para ver o sistema completo!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {carteiras.map((c) => (
                  <Link href={`/carteira/${c.id}`} key={c.id}>
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-emerald-500/50 hover:bg-gray-800 transition-all cursor-pointer h-full">
                      <h3 className="text-lg font-medium text-gray-100">{c.nome}</h3>
                      <p className="text-sm text-gray-500 mt-1">ID: #{c.id}</p>
                      <div className="mt-6">
                        <p className="text-sm text-gray-400">Saldo em Caixa</p>
                        <p className="text-3xl font-bold text-emerald-400 mt-1 tabular-nums">R$ {parseFloat(c.saldo_caixa).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}