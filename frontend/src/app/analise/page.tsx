"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getIndicadores, gerarAnalise, getCotacoes, Indicadores, Analise, Cotacao } from "@/lib/api";
import Link from "next/link";
import dynamic from "next/dynamic";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

function AnaliseContent() {
  const searchParams = useSearchParams();
  const initialTicker = searchParams.get("ticker") || "";

  const [ticker, setTicker] = useState(initialTicker);
  const [indicadores, setIndicadores] = useState<Indicadores | null>(null);
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buscarDados(t: string) {
    if (!t) return;
    
    setLoading(true);
    setError(null);
    setIndicadores(null);
    setAnalise(null);
    setCotacoes([]);

    try {
      const [indData, cotData] = await Promise.all([
        getIndicadores(t),
        getCotacoes(t)
      ]);
      setIndicadores(indData);
      setCotacoes(cotData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Se veio um ticker pela URL, busca automaticamente ao carregar a página
  useEffect(() => {
    if (initialTicker) {
      buscarDados(initialTicker);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTicker]);

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    buscarDados(ticker.trim().toUpperCase());
  }

  async function handleAnalisar() {
    if (!indicadores) return;
    try {
      const result = await gerarAnalise(indicadores.ticker);
      setAnalise(result);
    } catch (err: any) {
      setError(err.message);
    }
  }

  const chartOptions = {
    chart: { type: "candlestick" as const, background: "transparent", toolbar: { show: false } },
    theme: { mode: "dark" as const },
    xaxis: { type: "datetime" as const },
    yaxis: { tooltip: { enabled: true } },
    plotOptions: { candlestick: { colors: { upward: "#10b981", downward: "#ef4444" } } }
  };

  const chartSeries = [{
    name: "Preço",
    data: cotacoes.map(c => ({
      x: new Date(c.data).getTime(),
      y: [
        parseFloat(c.abertura || "0"),
        parseFloat(c.maxima || "0"),
        parseFloat(c.minima || "0"),
        parseFloat(c.fechamento || "0")
      ]
    }))
  }];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <header className="mb-8 border-b border-gray-800 pb-4">
        <Link href="/" className="text-emerald-500 hover:underline text-sm mb-2 inline-block">&larr; Voltar ao Dashboard</Link>
        <h1 className="text-3xl font-bold">Análise de Ativos</h1>
        <p className="text-gray-400 mt-1">Consulte indicadores e sinais de mercado</p>
      </header>

      <section className="mb-8">
        <form onSubmit={handleFormSubmit} className="flex gap-4 max-w-md">
          <input 
            type="text" 
            value={ticker} 
            onChange={e => setTicker(e.target.value)} 
            placeholder="Ex: PETR4, VALE3, AAPL"
            className="flex-1 bg-gray-900 border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-emerald-500 uppercase"
          />
          <button type="submit" disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded transition-colors disabled:opacity-50">
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </form>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </section>

      {indicadores && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-emerald-500">{indicadores.ticker}</h2>
                  <p className="text-gray-400 text-sm">{indicadores.nome}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Fechamento</p>
                  <p className="text-2xl font-bold">R$ {indicadores.fechamento.toFixed(2)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-950 p-4 rounded">
                  <p className="text-gray-500 text-xs">RSI (14)</p>
                  <p className="text-xl font-semibold">{indicadores.rsi_14 ? indicadores.rsi_14.toFixed(2) : "N/A"}</p>
                </div>
                <div className="bg-gray-950 p-4 rounded">
                  <p className="text-gray-500 text-xs">MACD Histograma</p>
                  <p className={`text-xl font-semibold ${indicadores.macd_histograma && indicadores.macd_histograma > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {indicadores.macd_histograma ? indicadores.macd_histograma.toFixed(4) : "N/A"}
                  </p>
                </div>
                <div className="bg-gray-950 p-4 rounded">
                  <p className="text-gray-500 text-xs">EMA (9)</p>
                  <p className="text-xl font-semibold">{indicadores.ema_9 ? indicadores.ema_9.toFixed(2) : "N/A"}</p>
                </div>
                <div className="bg-gray-950 p-4 rounded">
                  <p className="text-gray-500 text-xs">SMA (20)</p>
                  <p className="text-xl font-semibold">{indicadores.sma_20 ? indicadores.sma_20.toFixed(2) : "N/A"}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col justify-center items-center text-center">
              {!analise ? (
                <>
                  <p className="text-gray-400 mb-4">Deseja gerar o sinal do motor V1?</p>
                  <button onClick={handleAnalisar}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded transition-colors">
                    Gerar Análise
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-400 mb-2">Sinal do Motor ({analise.versao_modelo})</p>
                  <h2 className={`text-5xl font-black mb-6 ${
                    analise.sinal === "COMPRA" ? "text-emerald-500" : 
                    analise.sinal === "VENDA" ? "text-red-500" : "text-yellow-500"
                  }`}>
                    {analise.sinal}
                  </h2>
                  <p className="text-gray-300 text-sm leading-relaxed bg-gray-950 p-4 rounded border border-gray-800">
                    {analise.justificativa}
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-300">Histórico de Preços (60 dias)</h2>
            <div className="h-[400px] w-full">
              <Chart options={chartOptions} series={chartSeries} type="candlestick" height="100%" width="100%" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnaliseAtivo() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Carregando...</div>}>
      <AnaliseContent />
    </Suspense>
  );
}