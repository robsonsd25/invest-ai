"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { getIndicadores, gerarAnalise, getCotacoes, getCarteiras, getPosicoes, executarOperacao, getFavoritos, addFavorito, removeFavorito, Indicadores, Analise, Cotacao, Carteira, CarteiraDetalhe } from "@/lib/api";
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
  const [carteiraDetalhe, setCarteiraDetalhe] = useState<CarteiraDetalhe | null>(null);
  const [quantidade, setQuantidade] = useState<string>("10");
  const [enviandoOrdem, setEnviandoOrdem] = useState(false);

  // Busca a carteira detalhada quando o usuário troca de carteira
  useEffect(() => {
    if (!carteiraSelecionada) return;
    getPosicoes(carteiraSelecionada).then(setCarteiraDetalhe).catch(console.error);
  }, [carteiraSelecionada]);

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
      if (cartData.length > 0 && !carteiraSelecionada) {
        setCarteiraSelecionada(cartData[0].id.toString());
      }
      setIsFavorito(favs.some(f => f.ticker === t));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (initialTicker) buscarDados(initialTicker); }, [initialTicker]);

  // Recarrega a carteira detalhada quando uma operação é feita
  async function recarregarCarteira() {
    if (!carteiraSelecionada) return;
    try {
      const data = await getPosicoes(carteiraSelecionada);
      setCarteiraDetalhe(data);
    } catch (err) { console.error(err); }
  }

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

    // Validações locais rápidas
    if (tipo === "COMPRA") {
      const custo = qtd * indicadores.fechamento;
      if (carteiraDetalhe && custo > carteiraDetalhe.saldo_caixa) {
        toast.error(`Saldo insuficiente. Necessário: R$ ${custo.toFixed(2)}`);
        return;
      }
    }
    if (tipo === "VENDA") {
      const pos = carteiraDetalhe?.posicoes.find(p => p.ticker === indicadores.ticker);
      if (!pos || qtd > pos.quantidade) {
        toast.error(`Você não tem ${qtd} ações de ${indicadores.ticker}.`);
        return;
      }
    }

    setEnviandoOrdem(true);
    try {
      await executarOperacao(carteiraSelecionada, { ticker: indicadores.ticker, tipo, quantidade: qtd, preco_unitario: indicadores.fechamento });
      toast.success(`Ordem de ${tipo} de ${qtd} ${indicadores.ticker} executada!`);
      await recarregarCarteira();
    } catch (err: any) { toast.error(err.message); } finally { setEnviandoOrdem(false); }
  }

  // QUANTIDADE RÁPIDA
  function adicionarQtd(inc: number) {
    const atual = parseFloat(quantidade) || 0;
    setQuantidade((atual + inc).toString());
  }
  function definirMaxCompra() {
    if (!indicadores || !carteiraDetalhe) return;
    const max = Math.floor(carteiraDetalhe.saldo_caixa / indicadores.fechamento);
    setQuantidade(max.toString());
  }
  function definirMaxVenda() {
    if (!indicadores || !carteiraDetalhe) return;
    const pos = carteiraDetalhe.posicoes.find(p => p.ticker === indicadores.ticker);
    if (pos) setQuantidade(pos.quantidade.toString());
  }

  // CÁLCULOS DA OPERAÇÃO
  const calc = useMemo(() => {
    if (!indicadores) return null;
    const qtd = parseFloat(quantidade) || 0;
    const total = qtd * indicadores.fechamento;
    const saldoAtual = carteiraDetalhe?.saldo_caixa || 0;
    const posAtual = carteiraDetalhe?.posicoes.find(p => p.ticker === indicadores.ticker);
    return {
      total,
      saldoAtual,
      saldoAposCompra: saldoAtual - total,
      saldoAposVenda: saldoAtual + total,
      posAtual: posAtual?.quantidade || 0,
      precoMedio: posAtual?.preco_medio || 0,
      pnl: posAtual?.lucro_prejuizo || 0,
      pnlPct: posAtual?.rentabilidade_pct || 0,
      temSaldo: total <= saldoAtual,
      temAcoes: qtd <= (posAtual?.quantidade || 0),
    };
  }, [indicadores, quantidade, carteiraDetalhe]);

  // GRÁFICO
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
            
            {/* CARD INDICADORES COM FAVORITO */}
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

            {/* CARD SINAL */}
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

            {/* INFORMAÇÕES DA SUA POSIÇÃO */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Sua Posição</h2>
              {calc && calc.posAtual > 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Quantidade</span>
                    <span className="font-bold tabular-nums">{calc.posAtual} ações</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Preço Médio</span>
                    <span className="font-bold tabular-nums">R$ {calc.precoMedio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Valor Atual</span>
                    <span className="font-bold tabular-nums">R$ {(calc.posAtual * indicadores.fechamento).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-3 border-t border-gray-200 dark:border-gray-800">
                    <span className="text-gray-500">Lucro/Prejuízo</span>
                    <span className={`font-bold tabular-nums ${calc.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {calc.pnl >= 0 ? '+' : ''}R$ {calc.pnl.toFixed(2)} ({calc.pnlPct.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">Você ainda não possui ações de {indicadores.ticker} nesta carteira.</p>
                </div>
              )}
            </div>

          </div>

          {/* PAINEL DE NEGOCIAÇÃO EXPANDIDO */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 md:p-8">
            <h2 className="text-2xl font-bold mb-6">💼 Mesa de Operações</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* COLUNA ESQUERDA: CONFIGURAÇÃO */}
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Carteira</label>
                  <select 
                    value={carteiraSelecionada} 
                    onChange={e => setCarteiraSelecionada(e.target.value)} 
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg p-3 font-semibold"
                  >
                    {carteiras.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  {calc && (
                    <p className="text-xs text-gray-500 mt-2">
                      Saldo disponível: <span className="font-bold tabular-nums">R$ {calc.saldoAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Quantidade</label>
                  <div className="flex gap-2">
                    <button onClick={() => adicionarQtd(-10)} className="px-3 py-2 bg-gray-200 dark:bg-gray-800 rounded-lg font-bold hover:bg-gray-300 dark:hover:bg-gray-700">-10</button>
                    <input 
                      type="number" 
                      min="1" 
                      value={quantidade} 
                      onChange={e => setQuantidade(e.target.value)}
                      className="flex-1 bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded-lg p-3 text-center font-bold text-lg"
                    />
                    <button onClick={() => adicionarQtd(10)} className="px-3 py-2 bg-gray-200 dark:bg-gray-800 rounded-lg font-bold hover:bg-gray-300 dark:hover:bg-gray-700">+10</button>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setQuantidade("10")} className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-xs rounded hover:bg-gray-200 dark:hover:bg-gray-700">10</button>
                    <button onClick={() => setQuantidade("50")} className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-xs rounded hover:bg-gray-200 dark:hover:bg-gray-700">50</button>
                    <button onClick={() => setQuantidade("100")} className="flex-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-xs rounded hover:bg-gray-200 dark:hover:bg-gray-700">100</button>
                    <button onClick={definirMaxCompra} className="flex-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs rounded font-bold hover:bg-emerald-200 dark:hover:bg-emerald-800">Máx C</button>
                    <button onClick={definirMaxVenda} className="flex-1 px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-xs rounded font-bold hover:bg-red-200 dark:hover:bg-red-800">Máx V</button>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">Preço Unitário</span>
                    <span className="font-semibold tabular-nums">R$ {indicadores.fechamento.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-500">Quantidade</span>
                    <span className="font-semibold tabular-nums">{parseFloat(quantidade) || 0} ações</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-3 border-t border-gray-300 dark:border-gray-700">
                    <span>Total da Ordem</span>
                    <span className="tabular-nums text-emerald-600 dark:text-emerald-400">R$ {(calc?.total || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* COLUNA DIREITA: AÇÕES E PREVISÃO */}
              <div className="space-y-4">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg p-4">
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium mb-1">Saldo APÓS a compra</p>
                  <p className={`text-xl font-bold tabular-nums ${calc && calc.saldoAposCompra < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    R$ {(calc?.saldoAposCompra || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  {calc && !calc.temSaldo && <p className="text-xs text-red-500 mt-1">⚠️ Saldo insuficiente</p>}
                </div>

                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-4">
                  <p className="text-xs text-red-700 dark:text-red-300 font-medium mb-1">Saldo APÓS a venda</p>
                  <p className="text-xl font-bold tabular-nums text-red-600 dark:text-red-400">
                    R$ {(calc?.saldoAposVenda || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  {calc && !calc.temAcoes && <p className="text-xs text-red-500 mt-1">⚠️ Ações insuficientes</p>}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button 
                    onClick={() => handleExecutarOrdem("COMPRA")} 
                    disabled={enviandoOrdem || !calc?.temSaldo}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-lg"
                  >
                    {enviandoOrdem ? "..." : "🟢 Comprar"}
                  </button>
                  <button 
                    onClick={() => handleExecutarOrdem("VENDA")} 
                    disabled={enviandoOrdem || !calc?.temAcoes}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-lg"
                  >
                    {enviandoOrdem ? "..." : "🔴 Vender"}
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* GRÁFICO */}
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