"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getIndicadores, gerarAnalise, getCotacoes, getCarteiras, executarOperacao, getFavoritos, addFavorito, removeFavorito, Indicadores, Analise, Cotacao, Carteira } from "@/lib/api";
import Link from "next/link";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { ThemeToggle } from "@/components/ThemeToggle";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

function AnaliseContent() {
  const searchParams = useSearchParams();
  const initialTicker = searchParams.get("ticker") || "";

  const [ticker, setTicker] = useState(initialTicker);
  const [indicadores, setIndicadores] = useState<Indicadores | null>(null);
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [isFavorito, setIsFavorito] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [carteiras, setCarteiras] = useState<Carteira[]>([]);
  const [carteiraSelecionada, setCarteiraSelecionada] = useState<string>("");
  const [quantidade, setQuantidade] = useState<string>("10");
  const [enviandoOrdem, setEnviandoOrdem] = useState(false);

  async function buscarDados(t: string) {
    if (!t) return;
    setLoading(true); setError(null); setIndicadores(null); setAnalise(null); setCotacoes([]);

    try {
      const [indData, cotData, cartData, favs] = await Promise.all([
        getIndicadores(t), getCotacoes(t), getCarteiras(), getFavoritos()
      ]);
      setIndicadores(indData);
      setCotacoes(cotData);
      setCarteiras(cartData);
      if (cartData.length > 0) setCarteiraSelecionada(cartData[0].id.toString());
      setIsFavorito(favs.some(f => f.ticker === t));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (initialTicker) buscarDados(initialTicker); }, [initialTicker]);

  async function toggleFavorito() {
    if (!indicadores) return;
    try {
      if (isFavorito) {
        await removeFavorito(indicadores.ticker);
        setIsFavorito(false); toast.success("Removido dos favoritos.");
      } else {
        await addFavorito(indicadores.ticker);
        setIsFavorito(true); toast.success("Adicionado aos favoritos!");
      }
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleFormSubmit(e: React.FormEvent) { e.preventDefault(); buscarDados(ticker.trim().toUpperCase()); }
  async function handleAnalisar() { if (!indicadores) return; try { setAnalise(await gerarAnalise(indicadores.ticker)); } catch (err: any) { toast.error(err.message); } }

  async function handleExecutarOrdem(tipo: "COMPRA" | "VENDA") {
    if (!carteiraSelecionada) { toast.error("Selecione uma carteira."); return; }
    if (!indicadores) return;
    const qtd = parseFloat(quantidade);
    if (isNaN(qtd) || qtd <= 0) { toast.error("Quantidade inválida."); return; }

    setEnviandoOrdem(true);
    try {
      await executarOperacao(carteiraSelecionada, { ticker: indicadores.ticker, tipo, quantidade: qtd, preco_unitario: indicadores.fechamento });
      toast.success(`Ordem de ${tipo} executada!`);
    } catch (err: any) { toast.error(err.message); } finally { setEnviandoOrdem(false); }
  }

  const precosFechamento = cotacoes.map(c => parseFloat(c.fechamento || "0"));
  const datas = cotacoes.map(c => new Date(c.data).getTime());
  
  function calcularSMA(data: number[], period: number) {
    return data.map((_, i) => {
      if (i < period - 1) return null;
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      return sum / period;
    });
  }
  function calcularEMA(data: number[], period: number) {
    const k = 2 / (period + 1);
    let emaArray = [data[0]];
    for (let i = 1; i < data.length; i++) emaArray.push(data[i] * k + emaArray[i - 1] * (1 - k));
    return emaArray;
  }

  const chartSeries = [
    { name: "Preço", type: "candlestick", data: cotacoes.map(c => ({ x: new Date(c.data).getTime(), y: [parseFloat(c.abertura||"0"), parseFloat(c.maxima||"0"), parseFloat(c.minima||"0"), parseFloat(c.fechamento||"0")] })) },
    { name: "SMA 20", type: "line", data: calcularSMA(precosFechamento, 20).map((val, i) => val ? { x: datas[i], y: val } : null).filter(Boolean) },
    { name: "EMA 9", type: "line", data: calcularEMA(precosFechamento, 9).map((val, i) => ({ x: datas[i], y: val })) }
  ];

  const chartOptions = {
    chart: { type: "candlestick" as const, background: "transparent", toolbar: { show: false } },
    theme: { mode: "dark" as const },
    xaxis: { type: "datetime" as const },
    plotOptions: { candlestick: { colors: { upward: "#10b981", downward: "#ef4444" } } },
    stroke: { width: [1, 1, 1], colors: ['#10b981', '#f59e0b', '#3b82f6'] }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-white p-4 md:p-8 transition-colors">
      <header className="mb-8 border-b border-gray-200 dark:border-gray-800 pb-4 flex justify-between items-start">
        <div>
          <Link href="/" className="text-emerald-600 dark:text-emerald-500 hover:underline text-sm mb-2 inline-block">&larr; Voltar ao Dashboard</Link>
          <h1 className="text-3xl font-bold">Análise e Operação</h1>
        </div>
        <ThemeToggle />
      </header>

      <section className="mb-8">
        <form onSubmit={handleFormSubmit} className="flex gap-4 max-w-md">
          <input type="text" value={ticker} onChange={e => setTicker(e.target.value)} placeholder="Ex: PETR4"
            className="flex-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded p-3 uppercase focus:outline-none focus:border-emerald-500" />
          <button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded">
            {loading ? "..." : "Buscar"}
          </button>
        </form>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </section>

      {indicadores && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 relative">
              <button onClick={toggleFavorito} className="absolute top-6 right-6 text-2xl hover:scale-110 transition-transform">
                {isFavorito ? "⭐" : "☆"}
              </button>
              <div className="flex justify-between items-start mb-6 pr-8">
                <div>
                  <h2 className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">{indicadores.ticker}</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm truncate max-w-[150px]">{indicadores.nome}</p>
                </div>
              </div>
              <div className="text-left mb-6">
                <p className="text-sm text-gray-500 dark:text-gray-400">Fechamento</p>
                <p className="text-3xl font-bold tabular-nums">R$ {indicadores.fechamento.toFixed(2)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-950 p-3 rounded"><p className="text-gray-500 text-xs">RSI (14)</p><p className="text-lg font-semibold">{indicadores.rsi_14?.toFixed(2) || "N/A"}</p></div>
                <div className="bg-gray-50 dark:bg-gray-950 p-3 rounded"><p className="text-gray-500 text-xs">MACD</p><p className={`text-lg font-semibold ${indicadores.macd_histograma && indicadores.macd_histograma > 0 ? 'text-emerald-500' : 'text-red-500'}`}>{indicadores.macd_histograma?.toFixed(4) || "N/A"}</p></div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 flex flex-col justify-center items-center text-center">
              {!analise ? (
                <><p className="text-gray-500 dark:text-gray-400 mb-4">Gerar sinal do motor V1?</p>
                <button onClick={handleAnalisar} className="bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 font-bold py-3 px-8 rounded">Gerar Análise</button></>
              ) : (
                <><p className="text-sm text-gray-500 mb-2">Sinal ({analise.versao_modelo})</p>
                <h2 className={`text-5xl font-black mb-6 ${analise.sinal === "COMPRA" ? "text-emerald-500" : analise.sinal === "VENDA" ? "text-red-500" : "text-yellow-500"}`}>{analise.sinal}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-950 p-4 rounded border border-gray-200 dark:border-gray-800">{analise.justificativa}</p></>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Negociação Rápida</h2>
              <div className="space-y-4">
                <select value={carteiraSelecionada} onChange={e => setCarteiraSelecionada(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded p-3">
                  {carteiras.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                <input type="number" min="1" value={quantidade} onChange={e => setQuantidade(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded p-3" />
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button onClick={() => handleExecutarOrdem("COMPRA")} disabled={enviandoOrdem} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded">Comprar</button>
                  <button onClick={() => handleExecutarOrdem("VENDA")} disabled={enviandoOrdem} className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded">Vender</button>
                </div>
              </div>
            </div>

          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-4">Histórico de Preços (60 dias)</h2>
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
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white flex items-center justify-center">Carregando...</div>}>
      <AnaliseContent />
    </Suspense>
  );
}