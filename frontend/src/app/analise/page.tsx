"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getIndicadores, gerarAnalise, getCotacoes, getCarteiras, executarOperacao, Indicadores, Analise, Cotacao, Carteira } from "@/lib/api";
import Link from "next/link";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";

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

  // Estados para a Negociação Rápida
  const [carteiras, setCarteiras] = useState<Carteira[]>([]);
  const [carteiraSelecionada, setCarteiraSelecionada] = useState<string>("");
  const [quantidade, setQuantidade] = useState<string>("10");
  const [enviandoOrdem, setEnviandoOrdem] = useState(false);

  async function buscarDados(t: string) {
    if (!t) return;
    
    setLoading(true);
    setError(null);
    setIndicadores(null);
    setAnalise(null);
    setCotacoes([]);

    try {
      const [indData, cotData, cartData] = await Promise.all([
        getIndicadores(t),
        getCotacoes(t),
        getCarteiras() // Busca as carteiras para o formulário
      ]);
      setIndicadores(indData);
      setCotacoes(cotData);
      setCarteiras(cartData);
      if (cartData.length > 0) {
        setCarteiraSelecionada(cartData[0].id.toString());
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

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
      toast.error(err.message);
    }
  }

  // FUNÇÃO PARA EXECUTAR ORDEM DIRETO DA TELA DE ANÁLISE
  async function handleExecutarOrdem(tipo: "COMPRA" | "VENDA") {
    if (!carteiraSelecionada) {
      toast.error("Selecione uma carteira.");
      return;
    }
    if (!indicadores) return;
    
    const qtd = parseFloat(quantidade);
    if (isNaN(qtd) || qtd <= 0) {
      toast.error("Digite uma quantidade válida.");
      return;
    }

    setEnviandoOrdem(true);
    try {
      await executarOperacao(carteiraSelecionada, {
        ticker: indicadores.ticker,
        tipo,
        quantidade: qtd,
        preco_unitario: indicadores.fechamento, // Usa o preço de fechamento atual
      });
      toast.success(`Ordem de ${tipo} executada com sucesso!`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEnviandoOrdem(false);
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
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <header className="mb-8 border-b border-gray-800 pb-4">
        <Link href="/" className="text-emerald-500 hover:underline text-sm mb-2 inline-block">&larr; Voltar ao Dashboard</Link>
        <h1 className="text-3xl font-bold">Análise e Operação</h1>
        <p className="text-gray-400 mt-1">Consulte indicadores e execute ordens</p>
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
          
          {/* GRID PRINCIPAL: INDICADORES, SINAL E NEGOCIAÇÃO */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* CARD DE INDICADORES */}
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

            {/* CARD DE SINAL */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col justify-center items-center text-center">
              {!analise ? (
                <>
                  <p className="text-gray-400 mb-4">Deseja gerar o sinal do motor V1?</p>
                  <button onClick={handleAnalisar}
                    className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded transition-colors border border-gray-700">
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

            {/* CARD DE NEGOCIAÇÃO RÁPIDA (NOVO) */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 text-gray-200">Negociação Rápida</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Escolha a Carteira</label>
                  <select 
                    value={carteiraSelecionada} 
                    onChange={e => setCarteiraSelecionada(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="" disabled>Selecione...</option>
                    {carteiras.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Quantidade</label>
                  <input 
                    type="number" 
                    min="1" 
                    step="1"
                    value={quantidade} 
                    onChange={e => setQuantidade(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="bg-gray-950 p-3 rounded border border-gray-800">
                  <div className="flex justify-between text-sm text-gray-400 mb-1">
                    <span>Preço Unitário:</span>
                    <span className="text-white tabular-nums">R$ {indicadores.fechamento.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-800 mt-1">
                    <span>Total Estimado:</span>
                    <span className="text-emerald-400 tabular-nums">
                      R$ {(parseFloat(quantidade || "0") * indicadores.fechamento).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button 
                    onClick={() => handleExecutarOrdem("COMPRA")} 
                    disabled={enviandoOrdem}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded transition-colors disabled:opacity-50"
                  >
                    Comprar
                  </button>
                  <button 
                    onClick={() => handleExecutarOrdem("VENDA")} 
                    disabled={enviandoOrdem}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded transition-colors disabled:opacity-50"
                  >
                    Vender
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* GRÁFICO */}
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