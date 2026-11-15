"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCarteiras, Carteira, getToken, removeToken } from "@/lib/api";
import Link from "next/link";

export default function Dashboard() {
  const router = useRouter();
  const [carteiras, setCarteiras] = useState<Carteira[]>([]);
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
        const data = await getCarteiras();
        setCarteiras(data);
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
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <header className="mb-12 border-b border-gray-800 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            INVEST <span className="text-emerald-500">AI</span>
          </h1>
          <p className="text-gray-400 mt-1">
            Plataforma de inteligência e análise de investimentos
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <Link href="/noticias" className="bg-blue-900 hover:bg-blue-800 text-blue-100 px-4 py-2 rounded-lg text-sm transition-colors border border-blue-700 font-semibold">
            📰 Notícias
          </Link>
          <Link href="/radar" className="bg-purple-900 hover:bg-purple-800 text-purple-100 px-4 py-2 rounded-lg text-sm transition-colors border border-purple-700 font-semibold">
            🏆 Radar
          </Link>
          <Link href="/analise" className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors border border-gray-700">
            Análise &rarr;
          </Link>
          <button onClick={handleLogout} className="text-red-400 hover:text-red-300 px-2 py-2 text-sm font-semibold transition-colors ml-2">
            Sair
          </button>
        </div>
      </header>

      {error && <div className="bg-red-900/50 text-red-400 p-4 rounded-xl mb-6">{error}</div>}

      <section>
        <h2 className="text-xl font-semibold mb-6 text-gray-300">
          Minhas Carteiras Virtuais
        </h2>
        
        {/* SKELETON LOADER */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg h-[220px] animate-pulse">
                <div className="h-6 bg-gray-800 rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-gray-800 rounded w-1/4 mb-8"></div>
                <div className="h-4 bg-gray-800 rounded w-1/3 mb-2"></div>
                <div className="h-10 bg-gray-800 rounded w-3/4 mb-6"></div>
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-800 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-800 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {carteiras.map((carteira) => (
              <Link href={`/carteira/${carteira.id}`} key={carteira.id}>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg hover:border-emerald-500/50 hover:bg-gray-800 transition-all cursor-pointer block h-full">
                  <h3 className="text-lg font-medium text-gray-100">
                    {carteira.nome}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">ID: #{carteira.id}</p>
                  
                  <div className="mt-6">
                    <p className="text-sm text-gray-400">Saldo em Caixa</p>
                    <p className="text-3xl font-bold text-emerald-400 mt-1">
                      R$ {parseFloat(carteira.saldo_caixa).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  
                  <div className="mt-4 flex justify-between text-sm text-gray-500">
                    <span>Capital Inicial:</span>
                    <span>R$ {parseFloat(carteira.capital_inicial).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}