"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams } from "next/navigation";
import { getPosicoes, executarOperacao, getExtrato, getPrecoAtual, CarteiraDetalhe, OperacaoExtrato } from "@/lib/api";
import Link from "next/link";
import toast from "react-hot-toast";

function CarteiraContent() {
  const params = useParams();
  const carteiraId = params.id as string;

  const [detalhe, setDetalhe] = useState<CarteiraDetalhe | null>(null);
  const [extrato, setExtrato] = useState<OperacaoExtrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ticker, setTicker] = useState("PETR4");
  const [tipo, setTipo] = useState<"COMPRA" | "VENDA">("COMPRA");
  const [quantidade, setQuantidade] = useState("10");
  const [preco, setPreco] = useState("");
  const [buscandoPreco, setBuscandoPreco] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const carregarDados = useCallback(async () => {
    try {
      const [dataPosicoes, dataExtrato] = await Promise.all([getPosicoes(carteiraId), getExtrato(carteiraId)]);
      setDetalhe(dataPosicoes);
      setExtrato(dataExtrato);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, [carteiraId]);

  useEffect(() => {
    if (carteiraId) carregarDados();
  }, [carteiraId, carregarDados]);

  // FUNCAO PARA BUSCAR O PRECO AUTOMATICO
  async function handleTickerChange(val: string) {
    setTicker(val);
    if (val.length >= 4) { // Só busca se tiver tamanho mínimo de ticker
      setBuscandoPreco(true);
      try {
        const data = await getPrecoAtual(val);
        setPreco(data.preco_atual.toFixed(2));
      } catch (err) {
        // Silencioso: se não achar, deixa o usuário digitar manualmente
      } finally {
        setBuscandoPreco(false);
      }
    }
  }

  async function handleOperar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await executarOperacao(carteiraId, {
        ticker: ticker.trim().toUpperCase(), tipo,
        quantidade: parseFloat(quantidade), preco_unitario: parseFloat(preco),
      });
      toast.success(`Ordem de ${tipo} executada!`);
      await carregarDados();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setEnviando(false);
    }
  }

  // FUNCAO PARA EXPORTAR CSV
  function exportarCSV() {
    if (extrato.length === 0) return;

    const headers = ["Data/Hora", "Ticker", "Tipo", "Quantidade", "Preco Unitario", "Total"];
    const rows = extrato.map(op => [
      new Date(op.executada_em).toLocaleString("pt-BR"),
      op.ticker,
      op.tipo,
      parseFloat(op.quantidade).toString(),
      parseFloat(op.preco_unitario).toFixed(2),
      (parseFloat(op.quantidade) * parseFloat(op.preco_unitario)).toFixed(2)
    ]);

    // Adiciona o BOM (\uFEFF) para o Excel reconhecer acentos
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `extrato_investai_carteira_${carteiraId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Download do extrato iniciado!");
  }

  if (error) return <div className="min-h-screen bg-gray-950 text-red-500 flex items-center justify-center p-4">Erro: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <header className="mb-8 border-b border-gray-800 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Link href="/" className="text-emerald-500 hover:underline text-sm mb-2 inline-block">&larr; Voltar ao Dashboard</Link>
          {loading ? <div className="h-8 bg-gray-800 rounded w-64 animate-pulse mt-2"></div> : <h1 className="text-2xl md:text-3xl font-bold">{detalhe?.nome}</h1>}
        </div>
        <div className="text-left md:text-right bg-gray-900 md:bg-transparent p-4 md:p-0 rounded-xl w-full md:w-auto">
          <p className="text-sm text-gray-400">Saldo Disponível</p>
          {loading ? <div className="h-8 bg-gray-800 rounded w-32 animate-pulse mt-1"></div> : <p className="text-2xl font-bold text-emerald-400 tabular-nums">R$ {detalhe?.saldo_caixa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>}
        </div>
      </header>

      {loading ? (
        <div className="space-y-8 animate-pulse">
          <div className="bg-gray-900 border border-gray-800 rounded-xl h-[100px]"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 h-[350px]"></div>
            <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl h-[350px]"></div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl h-[200px]"></div>
        </div>
      ) : (
        <>
          {/* GESTAO DE RISCO */}
          {(() => {
            const custoInvestido = detalhe?.posicoes.reduce((acc, pos) => acc + pos.custo_total, 0) || 0;
            const limiteMaximo = detalhe ? (detalhe.capital_inicial * detalhe.max_exposicao_pct) / 100 : 0;
            const percentualUsado = limiteMaximo > 0 ? (custoInvestido / limiteMaximo) * 100 : 0;
            let corBarra = "bg-emerald-500";
            if (percentualUsado > 70) corBarra = "bg-yellow-500";
            if (percentualUsado > 90) corBarra = "bg-red-500";
            
            return (
              <section className="mb-8 bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-200">Limite de Exposição ({detalhe?.max_exposicao_pct}%)</h2>
                    <p className="text-sm text-gray-400 mt-1">Quanto do capital total está investido em ativos.</p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="text-sm text-gray-400">Investido / Limite</p>
                    <p className="font-bold text-lg">R$ {custoInvestido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} <span className="text-gray-500 text-sm">/ R$ {limiteMaximo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span></p>
                  </div>
                </div>
                <div className="w-full bg-gray-950 rounded-full h-4 border border-gray-800 overflow-hidden">
                  <div className={`h-full ${corBarra} transition-all duration-500`} style={{ width: `${Math.min(percentualUsado, 100)}%` }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-right">{percentualUsado.toFixed(1)}% do limite utilizado</p>
              </section>
            );
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* FORMULÁRIO DE OPERAÇÃO */}
            <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 h-fit">
              <h2 className="text-lg font-semibold mb-4 text-gray-200">Simular Operação</h2>
              <form onSubmit={handleOperar} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Ativo (Ticker)</label>
                  <input type="text" value={ticker} onChange={e => handleTickerChange(e.target.value)} required
                    className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-emerald-500 uppercase" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Tipo</label>
                  <select value={tipo} onChange={e => setTipo(e.target.value as "COMPRA" | "VENDA")}
                    className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-emerald-500">
                    <option value="COMPRA">COMPRA</option>
                    <option value="VENDA">VENDA</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Qtd</label>
                    <input type="number" step="1" min="1" value={quantidade} onChange={e => setQuantidade(e.target.value)} required
                      className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1 flex justify-between">
                      Preço (R$)
                      {buscandoPreco && <span className="text-emerald-500 animate-pulse text-xs">buscando...</span>}
                    </label>
                    <input type="number" step="0.01" min="0.01" value={preco} onChange={e => setPreco(e.target.value)} required
                      className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-emerald-500" />
                  </div>
                </div>
                <button type="submit" disabled={enviando}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50">
                  {enviando ? "Enviando..." : "Executar Ordem"}
                </button>
              </form>
            </section>

            {/* TABELA DE POSIÇÕES */}
            <section className="lg:col-span-2">
              <h2 className="text-xl font-semibold mb-4 text-gray-300">Minhas Posições</h2>
              {detalhe?.posicoes.length === 0 ? (
                <p className="text-gray-500">Nenhuma ação em custódia.</p>
              ) : (
                <>
                  <div className="hidden md:block bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-gray-800 text-gray-400">
                        <tr><th className="p-4">Ativo</th><th className="p-4 text-right">Qtd</th><th className="p-4 text-right">Custo Médio</th><th className="p-4 text-right">Cotação Atual</th><th className="p-4 text-right">Valor Atual</th><th className="p-4 text-right">Rentabilidade</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {detalhe?.posicoes.map((pos) => (
                          <tr key={pos.ativo_id} className="hover:bg-gray-800/50">
                            <td className="p-4"><span className="font-bold text-emerald-500 text-base">{pos.ticker}</span><p className="text-xs text-gray-500 truncate max-w-[150px]">{pos.nome}</p></td>
                            <td className="p-4 text-right tabular-nums">{pos.quantidade}</td>
                            <td className="p-4 text-right text-gray-400 tabular-nums">R$ {pos.preco_medio.toFixed(2)}</td>
                            <td className="p-4 text-right font-medium tabular-nums">R$ {pos.preco_atual.toFixed(2)}</td>
                            <td className="p-4 text-right font-medium tabular-nums">R$ {pos.valor_atual.toFixed(2)}</td>
                            <td className={`p-4 text-right font-bold ${pos.lucro_prejuizo >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              <div className="flex flex-col items-end tabular-nums"><span>{pos.lucro_prejuizo >= 0 ? "+" : ""}R$ {pos.lucro_prejuizo.toFixed(2)}</span><span className="text-xs font-normal opacity-80">({pos.rentabilidade_pct >= 0 ? "+" : ""}{pos.rentabilidade_pct.toFixed(2)}%)</span></div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="md:hidden space-y-4">
                    {detalhe?.posicoes.map((pos) => (
                      <div key={pos.ativo_id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-4">
                          <div><span className="font-bold text-emerald-500 text-lg">{pos.ticker}</span><p className="text-xs text-gray-500">{pos.nome}</p></div>
                          <div className={`text-right tabular-nums ${pos.lucro_prejuizo >= 0 ? "text-emerald-400" : "text-red-400"}`}><p className="font-bold">{pos.lucro_prejuizo >= 0 ? "+" : ""}R$ {pos.lucro_prejuizo.toFixed(2)}</p><p className="text-xs">({pos.rentabilidade_pct >= 0 ? "+" : ""}{pos.rentabilidade_pct.toFixed(2)}%)</p></div>
                        </div>
                        <div className="grid grid-cols-2 gap-y-2 text-sm tabular-nums">
                          <div className="text-gray-400">Qtd: <span className="text-white">{pos.quantidade}</span></div>
                          <div className="text-gray-400 text-right">Custo: <span className="text-white">R$ {pos.preco_medio.toFixed(2)}</span></div>
                          <div className="text-gray-400">Atual: <span className="text-white">R$ {pos.preco_atual.toFixed(2)}</span></div>
                          <div className="text-gray-400 text-right">Total: <span className="text-white">R$ {pos.valor_atual.toFixed(2)}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>

          {/* EXTRATO COM BOTAO CSV */}
          <section className="mt-8 md:mt-12">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-300">Extrato de Operações</h2>
              {extrato.length > 0 && (
                <button onClick={exportarCSV} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm border border-gray-700 transition-colors">
                  ⬇️ Baixar CSV
                </button>
              )}
            </div>
            
            {extrato.length === 0 ? (
              <p className="text-gray-500">Nenhuma operação registrada ainda.</p>
            ) : (
              <>
                <div className="hidden md:block bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-800 text-gray-400"><tr><th className="p-4">Data / Hora</th><th className="p-4">Ativo</th><th className="p-4">Operação</th><th className="p-4 text-right">Qtd</th><th className="p-4 text-right">Preço Unit.</th><th className="p-4 text-right">Total</th></tr></thead>
                    <tbody className="divide-y divide-gray-800">
                      {extrato.map((op) => (
                        <tr key={op.id} className="hover:bg-gray-800/50">
                          <td className="p-4 text-gray-400 tabular-nums">{new Date(op.executada_em).toLocaleString("pt-BR")}</td>
                          <td className="p-4 font-bold text-gray-200">{op.ticker}</td>
                          <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${op.tipo === "COMPRA" ? "bg-emerald-900 text-emerald-400" : "bg-red-900 text-red-400"}`}>{op.tipo}</span></td>
                          <td className="p-4 text-right tabular-nums">{parseFloat(op.quantidade)}</td>
                          <td className="p-4 text-right tabular-nums">R$ {parseFloat(op.preco_unitario).toFixed(2)}</td>
                          <td className="p-4 text-right font-medium tabular-nums">R$ {(parseFloat(op.quantidade) * parseFloat(op.preco_unitario)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden space-y-4">
                  {extrato.map((op) => (
                    <div key={op.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2"><span className="font-bold text-gray-200 text-lg">{op.ticker}</span><span className={`px-2 py-1 rounded text-xs font-bold ${op.tipo === "COMPRA" ? "bg-emerald-900 text-emerald-400" : "bg-red-900 text-red-400"}`}>{op.tipo}</span></div>
                      <p className="text-xs text-gray-500 mb-4 tabular-nums">{new Date(op.executada_em).toLocaleString("pt-BR")}</p>
                      <div className="flex justify-between text-sm tabular-nums"><span className="text-gray-400">{parseFloat(op.quantidade)} un. x R$ {parseFloat(op.preco_unitario).toFixed(2)}</span><span className="font-semibold">R$ {(parseFloat(op.quantidade) * parseFloat(op.preco_unitario)).toFixed(2)}</span></div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default function DetalheCarteira() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Carregando...</div>}>
      <CarteiraContent />
    </Suspense>
  );
}