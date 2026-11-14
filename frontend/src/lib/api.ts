const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Carteira {
  id: number;
  perfil_id: number;
  nome: string;
  capital_inicial: string;
  saldo_caixa: string;
  moeda: string;
  ativa: boolean;
  criada_em: string;
}

export async function getCarteiras(): Promise<Carteira[]> {
  const res = await fetch(`${API_URL}/carteiras`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Erro ao buscar carteiras");
  return res.json();
}