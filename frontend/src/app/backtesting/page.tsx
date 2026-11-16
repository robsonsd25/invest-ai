"use client";

import { useEffect, useState, Suspense } from "react";
import { getAtivos, rodarBacktest, Ativo, BacktestResultado } from "@/lib/api";
import Link from "next/link";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ApexOptions, ApexAxisChartSeries } from "apexcharts";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const ESTRATEGIAS = [
  { codigo: "RSI", label: "RSI Contrário", descricao: "Compra quando RSI < 30 (sobrevendido), vende quando RSI > 70 (sobrecomprado)." },
  { codigo: "MEDIAS", label: "Médias Móveis", descricao: "Compra quando EMA9 > SMA20 (tendência de alta), vende quando EMA9 < SMA20." },
  { codigo: "MACD", label: "MACD", descricao: "Compra quando histograma MACD positivo, vende quando negativo." },
];

function BacktestingContent() {
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [ticker, setTicker] = useState("PETR4");
  const [estrategia, setEstrategia] = useState("RSI");
  const [capital, setCapital] = useState("10000");
  const [periodo, setPeriodo] = useState("365");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<BacktestResultado | null>(null);

  useEffect(() => {
    getAtivos().then(setAtivos).catch(() => toast.error("Erro ao carregar ativos."));
  }, []);

  async function handleRodar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResultado(null);
    try {
      const res = await rodarBacktest(ticker, estrategia, parseFloat(capital), parseInt(periodo));
      setResultado(res);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  const chartOptions: ApexOptions = {
    chart: { type: "area", background: "transparent", toolbar: { show: false }, zoom: { enabled: false } },
    theme: { mode: "dark" },
    colors: ["#10b981"],
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 3 },
    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.05, stops: [0, 100] } },
    xaxis: { type: "datetime", labels: { style: { colors: "#9ca3af" } } },
    yaxis: { labels: { style: { colors: "#9ca3af" }, formatter: (val: number) => `R$ ${val.toLocaleString("pt-BR")}` } },
    tooltip: { theme: "dark", y: { formatter: (val: number) => `R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` } },
    grid: { borderColor: "#374151", strokeDashArray: 4 }
  };

  const chartSeries: ApexAxisChartSeries = resultado ? [{
    name: "Patrimônio",
    data: resultado.curva_patrimonio.map(p => ({ x: new Date(p.data).getTime(), y: p.valor }))
  }] : [];

  const estrategiaAtual = ESTRATEGIAS.find(e => e.codigo === estrategia);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-white p-4 md:p-8 transition-colors">
      <header className="mb-8 border-b border-gray-200 dark:border-gray-800 pb-4 flex justify-between items-start">
        <div>
          <Link href="/" className="text-emerald-600 dark:text-emerald-500 hover:underline text-sm mb-2 inline-block">&larr; Voltar ao Dashboard</Link>
          <h1 className="text-3xl font-bold">🧪 Backtesting</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Teste estratégias no histórico real do mercado</p>
        </div>
        <ThemeToggle />
      </header>

      {/* FORMULÁRIO */}
      <form onSubmit={handleRodar} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Ativo</label>
            <select value={ticker} onChange={e => setTicker(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded p-3">
              {ativos.map(a => <option key={a.id} value={a.ticker}>{a.ticker} - {a.mercado_codigo}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Estratégia</label>
            <select value={estrategia} onChange={e => setEstrategia(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded p-3">
              {ESTRATEGIAS.map(e => <option key={e.codigo} value={e.codigo}>{e.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Capital Inicial (R$)</label>
            <input type="number" min="100" step="100" value={capital} onChange={e => setCapital(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded p-3" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Período</label>
            <select value={periodo} onChange={e => setPeriodo(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-700 rounded p-3">
              <option value="180">6 meses</option>
              <option value="365">1 ano</option>
              <option value="730">2 anos</option>
            </select>
          </div>
        </div>
        {estrategiaAtual && (
          <p className="text-xs text-gray-500 mt-3">💡 <strong>{estrategiaAtual.label}:</strong> {estrategiaAtual.descricao}</p>
        )}
        <button type="submit" disabled={loading} className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-lg transition-colors disabled:opacity-50">
          {loading ? "Rodando backtest..." : "▶ Rodar Backtest"}
        </button>
      </form>

      {resultado && (
        <>
          {/* MÉTRICAS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Capital Inicial</p>
              <p className="text-xl font-bold tabular-nums">R$ {resultado.capital_inicial.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Capital Final</p>
              <p className="text-xl font-bold tabular-nums">R$ {resultado.capital_final.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </div>
            <div className={`border rounded-xl p-4 shadow-sm ${resultado.lucro_prejuizo >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900' : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'}`}>
              <p className="text-xs text-gray-500 mb-1">Lucro/Prejuízo</p>
              <p className={`text-xl font-bold tabular-nums ${resultado.lucro_prejuizo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {resultado.lucro_prejuizo >= 0 ? '+' : ''}R$ {resultado.lucro_prejuizo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className={`text-xs font-semibold ${resultado.rentabilidade_pct >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {resultado.rentabilidade_pct >= 0 ? '+' : ''}{resultado.rentabilidade_pct.toFixed(2)}%
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Taxa de Acerto</p>
              <p className="text-xl font-bold tabular-nums">{resultado.taxa_acerto_pct.toFixed(1)}%</p>
              <p className="text-xs text-gray-500">{resultado.num_wins}W / {resultado.num_losses}L</p>
            </div>
          </div>

          {/* COMPARAÇÃO COM BENCHMARK */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-8 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Estratégia vs Buy & Hold</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Sua Estratégia ({resultado.estrategia})</p>
                <p className={`text-3xl font-bold tabular-nums ${resultado.rentabilidade_pct >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {resultado.rentabilidade_pct >= 0 ? '+' : ''}{resultado.rentabilidade_pct.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Comprar e Segurar (Buy & Hold)</p>
                <p className={`text-3xl font-bold tabular-nums ${resultado.benchmark_buy_hold_pct >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {resultado.benchmark_buy_hold_pct >= 0 ? '+' : ''}{resultado.benchmark_buy_hold_pct.toFixed(2)}%
                </p>
              </div>
            </div>
            <p className="text-sm mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              {resultado.rentabilidade_pct > resultado.benchmark_buy_hold_pct
                ? `✅ A estratégia bateu o Buy & Hold em ${(resultado.rentabilidade_pct - resultado.benchmark_buy_hold_pct).toFixed(2)} pontos percentuais.`
                : `❌ O Buy & Hold foi melhor. Você teria ganho ${(resultado.benchmark_buy_hold_pct - resultado.rentabilidade_pct).toFixed(2)} pp a mais apenas segurando o ativo.`}
            </p>
          </div>

          {/* GRÁFICO DE EVOLUÇÃO */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 mb-8 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Evolução do Capital</h2>
            <div className="h-[300px] w-full">
              <Chart options={chartOptions} series={chartSeries} type="area" height="100%" width="100%" />
            </div>
          </div>

          {/* LISTA DE OPERAÇÕES */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold">Operações Executadas ({resultado.num_operacoes})</h2>
              <p className="text-sm text-gray-500 mt-1">Período: {resultado.periodo_inicio} até {resultado.periodo_fim}</p>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 sticky top-0">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3 text-right">Preço</th>
                    <th className="p-3 text-right">Qtd</th>
                    <th className="p-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {resultado.operacoes.map((op, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-3 tabular-nums">{new Date(op.data).toLocaleDateString("pt-BR")}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${op.tipo === "COMPRA" ? "bg-emerald-900 text-emerald-400" : "bg-red-900 text-red-400"}`}>
                          {op.tipo}
                        </span>
                      </td>
                      <td className="p-3 text-right tabular-nums">R$ {op.preco.toFixed(2)}</td>
                      <td className="p-3 text-right tabular-nums">{op.quantidade}</td>
                      <td className="p-3 text-right tabular-nums font-medium">R$ {op.valor.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function BacktestingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white flex items-center justify-center">Carregando...</div>}>
      <BacktestingContent />
    </Suspense>
  );
}