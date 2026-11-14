"use client";

import { useEffect, useState } from "react";
import { getRadar, RadarResultado, RadarItem } from "@/lib/api";
import Link from "next/link";

export default function RadarPage() {
  const [radar, setRadar] = useState<RadarResultado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function carregar() {
      try {
        const data = await getRadar();
        setRadar(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, []);

  if (loading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Analisando o mercado...</div>;
  if (error) return <div className="min-h-screen bg-gray-950 text-red-500 flex items-center justify-center">Erro: {error}</div>;
  if (!radar) return null;

  const renderizarColuna = (titulo: string, itens: RadarItem[], corBorda: string, corTexto: string) => (
    <div className="flex-1">
      <h2 className={`text-xl font-bold mb-4 border-b pb-2 ${corBorda} ${corTexto}`}>
        {titulo} ({itens.length})
      </h2>
      <div className="space-y-4">
        {itens.length === 0 ? (
          <p className="text-gray-500 text-sm italic">Nenhum ativo neste status.</p>
        ) : (
          itens.map((item) => (
            <Link key={item.ticker} href={`/analise?ticker=${item.ticker}`}>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:bg-gray-800 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg">{item.ticker}</h3>
                    <p className="text-xs text-gray-500">{item.mercado}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">R$ {item.fechamento.toFixed(2)}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 line-clamp-2">{item.justificativa}</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <header className="mb-8 border-b border-gray-800 pb-4">
        <Link href="/" className="text-emerald-500 hover:underline text-sm mb-2 inline-block">&larr; Voltar ao Dashboard</Link>
        <h1 className="text-3xl font-bold">Radar de Oportunidades</h1>
        <p className="text-gray-400 mt-1">Varredura determinística do motor V1 em todos os ativos</p>
      </header>

      <div className="flex flex-col md:flex-row gap-8">
        {renderizarColuna("Sinal de COMPRA", radar.compra, "border-emerald-500", "text-emerald-500")}
        {renderizarColuna("Sinal de VENDA", radar.venda, "border-red-500", "text-red-500")}
        {renderizarColuna("MANUTENÇÃO", radar.manutencao, "border-yellow-500", "text-yellow-500")}
      </div>
    </div>
  );
}