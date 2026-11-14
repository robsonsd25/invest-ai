"use client";

import { useEffect, useState } from "react";
import { getCarteiras, Carteira } from "@/lib/api";
import Link from "next/link";

export default function Dashboard() {
  const [carteiras, setCarteiras] = useState<Carteira[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <p className="animate-pulse text-xl">Carregando INVEST AI...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-red-500">
        <p>Erro: {error}. O backend está rodando?</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <header className="mb-12 border-b border-gray-800 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            INVEST <span className="text-emerald-500">AI</span>
          </h1>
          <p className="text-gray-400 mt-1">
            Plataforma de inteligência e análise de investimentos
          </p>
        </div>
        <Link href="/analise" className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors border border-gray-700 mb-1">
          Análise de Ativos &rarr;
        </Link>
      </header>

      <section>
        <h2 className="text-xl font-semibold mb-6 text-gray-300">
          Minhas Carteiras Virtuais
        </h2>
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
      </section>
    </div>
  );
}