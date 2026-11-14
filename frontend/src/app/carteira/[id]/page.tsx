"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams } from "next/navigation";
import { getPosicoes, executarOperacao, CarteiraDetalhe } from "@/lib/api";
import Link from "next/link";

// Componente interno que usa o useParams
function CarteiraContent() {
  const params = useParams();
  const carteiraId = params.id as string;

  const [detalhe, setDetalhe] = useState<CarteiraDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados do Formulário
  const [ticker, setTicker] = useState("PETR4");
  const [tipo, setTipo] = useState<"COMPRA" | "VENDA">("COMPRA");
  const [quantidade, setQuantidade] = useState("10");
  const [preco, setPreco] = useState("38.50");
  const [enviando, setEnviando] = useState(false);
  const [msgSucesso, setMsgSucesso] = useState<string | null>(null);
  const [msgErro, setMsgErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const data = await getPosicoes(carteiraId);
      setDetalhe(data);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar carteira.");
    } finally {
      setLoading(false);
    }
  }, [carteiraId]);

  useEffect(() => {
    if (carteiraId) carregar();
  }, [carteiraId, carregar]);

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
      await carregar(); // Recarrega o saldo e as posições
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
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

        {/* TABELA DE POSIÇÕES */}
        <section className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4 text-gray-300">Minhas Posições</h2>
          
          {detalhe.posicoes.length === 0 ? (
            <p className="text-gray-500">Nenhuma ação em custódia.</p>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-800 text-gray-400 text-sm">
                  <tr>
                    <th className="p-4">Ativo</th>
                    <th className="p-4">Qtd</th>
                    <th className="p-4">Preço Médio</th>
                    <th className="p-4 text-right">Custo Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {detalhe.posicoes.map((pos) => (
                    <tr key={pos.ativo_id} className="hover:bg-gray-800/50">
                      <td className="p-4">
                        <span className="font-bold text-emerald-500">{pos.ticker}</span>
                        <p className="text-xs text-gray-500">{pos.nome}</p>
                      </td>
                      <td className="p-4">{pos.quantidade}</td>
                      <td className="p-4">R$ {pos.preco_medio.toFixed(2)}</td>
                      <td className="p-4 text-right font-medium">R$ {pos.custo_total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// Componente principal exportado, com o Suspense
export default function DetalheCarteira() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Carregando dados...</div>}>
      <CarteiraContent />
    </Suspense>
  );
}