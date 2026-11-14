"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams } from "next/navigation";
import { getPosicoes, executarOperacao, getExtrato, CarteiraDetalhe, OperacaoExtrato } from "@/lib/api";
import Link from "next/link";

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
  const [preco, setPreco] = useState("38.50");
  const [enviando, setEnviando] = useState(false);
  const [msgSucesso, setMsgSucesso] = useState<string | null>(null);
  const [msgErro, setMsgErro] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    try {
      const [dataPosicoes, dataExtrato] = await Promise.all([
        getPosicoes(carteiraId),
        getExtrato(carteiraId)
      ]);
      setDetalhe(dataPosicoes);
      setExtrato(dataExtrato);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar dados da carteira.");
    } finally {
      setLoading(false);
    }
  }, [carteiraId]);

  useEffect(() => {
    if (carteiraId) carregarDados();
  }, [carteiraId, carregarDados]);

  async function handleOperar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setMsgErro(null);
    setMsgSucesso(null);

    try {
      await executarOperacao(carteiraId, {
        ticker: ticker.trim().toUpperCase(),
        tipo,
        quantidade: parseFloat(quantidade),
        preco_unitario: parseFloat(preco),
      });
      
      setMsgSucesso(`Ordem de ${tipo} executada com sucesso!`);
      await carregarDados();
    } catch (err: any) {
      setMsgErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Carregando...</div>;
  if (error) return <div className="min-h-screen bg-gray-950 text-red-500 flex items-center justify-center">Erro: {error}</div>;
  if (!detalhe) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <header className="mb-8 border-b border-gray-800 pb-4 flex justify-between items-center">
        <div>
          <Link href="/" className="text-emerald-500 hover:underline text-sm mb-2 inline-block">&larr; Voltar ao Dashboard</Link>
          <h1 className="text-3xl font-bold">{detalhe.nome}</h1>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Saldo Disponível</p>
          <p className="text-2xl font-bold text-emerald-400">R$ {detalhe.saldo_caixa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* FORMULÁRIO DE OPERAÇÃO */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 h-fit">
          <h2 className="text-lg font-semibold mb-4 text-gray-200">Simular Operação</h2>
          
          {msgSucesso && <div className="bg-emerald-900/50 text-emerald-400 p-3 rounded mb-4 text-sm">{msgSucesso}</div>}
          {msgErro && <div className="bg-red-900/50 text-red-400 p-3 rounded mb-4 text-sm">{msgErro}</div>}

          <form onSubmit={handleOperar} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Ativo (Ticker)</label>
              <input type="text" value={ticker} onChange={e => setTicker(e.target.value)} required
                className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-emerald-500" />
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
                <label className="block text-sm text-gray-400 mb-1">Preço (R$)</label>
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

        {/* TABELA DE POSIÇÕES ATUALIZADA COM P&L */}
        <section className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">Minhas Posições</h2>
          
          {detalhe.posicoes.length === 0 ? (
            <p className="text-gray-500">Nenhuma ação em custódia.</p>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-800 text-gray-400">
                  <tr>
                    <th className="p-4">Ativo</th>
                    <th className="p-4 text-right">Qtd</th>
                    <th className="p-4 text-right">Custo Médio</th>
                    <th className="p-4 text-right">Cotação Atual</th>
                    <th className="p-4 text-right">Valor Atual</th>
                    <th className="p-4 text-right">Rentabilidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {detalhe.posicoes.map((pos) => (
                    <tr key={pos.ativo_id} className="hover:bg-gray-800/50">
                      <td className="p-4">
                        <span className="font-bold text-emerald-500 text-base">{pos.ticker}</span>
                        <p className="text-xs text-gray-500 truncate max-w-[150px]">{pos.nome}</p>
                      </td>
                      <td className="p-4 text-right">{pos.quantidade}</td>
                      <td className="p-4 text-right text-gray-400">R$ {pos.preco_medio.toFixed(2)}</td>
                      <td className="p-4 text-right font-medium">R$ {pos.preco_atual.toFixed(2)}</td>
                      <td className="p-4 text-right font-medium">R$ {pos.valor_atual.toFixed(2)}</td>
                      <td className={`p-4 text-right font-bold ${pos.lucro_prejuizo >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        <div className="flex flex-col items-end">
                          <span>{pos.lucro_prejuizo >= 0 ? "+" : ""}R$ {pos.lucro_prejuizo.toFixed(2)}</span>
                          <span className="text-xs font-normal opacity-80">({pos.rentabilidade_pct >= 0 ? "+" : ""}{pos.rentabilidade_pct.toFixed(2)}%)</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* EXTRATO */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-4 text-gray-300">Extrato de Operações</h2>
        
        {extrato.length === 0 ? (
          <p className="text-gray-500">Nenhuma operação registrada ainda.</p>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-800 text-gray-400">
                <tr>
                  <th className="p-4">Data / Hora</th>
                  <th className="p-4">Ativo</th>
                  <th className="p-4">Operação</th>
                  <th className="p-4 text-right">Qtd</th>
                  <th className="p-4 text-right">Preço Unit.</th>
                  <th className="p-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {extrato.map((op) => (
                  <tr key={op.id} className="hover:bg-gray-800/50">
                    <td className="p-4 text-gray-400">
                      {new Date(op.executada_em).toLocaleString("pt-BR")}
                    </td>
                    <td className="p-4 font-bold text-gray-200">{op.ticker}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        op.tipo === "COMPRA" ? "bg-emerald-900 text-emerald-400" : "bg-red-900 text-red-400"
                      }`}>
                        {op.tipo}
                      </span>
                    </td>
                    <td className="p-4 text-right">{parseFloat(op.quantidade)}</td>
                    <td className="p-4 text-right">R$ {parseFloat(op.preco_unitario).toFixed(2)}</td>
                    <td className="p-4 text-right font-medium">
                      R$ {(parseFloat(op.quantidade) * parseFloat(op.preco_unitario)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default function DetalheCarteira() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Carregando dados...</div>}>
      <CarteiraContent />
    </Suspense>
  );
}