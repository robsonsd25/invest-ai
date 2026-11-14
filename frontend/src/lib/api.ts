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

export interface Posicao {
  ativo_id: number;
  ticker: string;
  nome: string;
  quantidade: number;
  preco_medio: number;
  custo_total: number;
}

export interface CarteiraDetalhe {
  carteira_id: number;
  nome: string;
  saldo_caixa: number;
  posicoes: Posicao[];
}

export interface OperacaoPayload {
  ticker: string;
  tipo: "COMPRA" | "VENDA";
  quantidade: number;
  preco_unitario: number;
}

export interface Indicadores {
  ticker: string;
  nome: string;
  mercado: string;
  data: string;
  fechamento: number;
  sma_20: number | null;
  sma_50: number | null;
  sma_200: number | null;
  ema_9: number | null;
  rsi_14: number | null;
  macd_linha: number | null;
  macd_sinal: number | null;
  macd_histograma: number | null;
  total_cotacoes: number;
}

export interface Analise {
  id: number;
  sinal: string;
  justificativa: string;
  versao_modelo: string;
}

export interface Cotacao {
  data: string;
  abertura: string | null;
  maxima: string | null;
  minima: string | null;
  fechamento: string | null;
  volume: number | null;
}

export async function getCarteiras(): Promise<Carteira[]> {
  const res = await fetch(`${API_URL}/carteiras`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Erro ao buscar carteiras");
  return res.json();
}

export async function getPosicoes(carteiraId: string | number): Promise<CarteiraDetalhe> {
  const res = await fetch(`${API_URL}/carteiras/${carteiraId}/posicoes`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Erro ao buscar posicoes");
  return res.json();
}

export async function executarOperacao(carteiraId: string | number, dados: OperacaoPayload) {
  const res = await fetch(`${API_URL}/carteiras/${carteiraId}/operacoes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!res.ok) {
    const erro = await res.json();
    throw new Error(erro.detail || "Erro ao executar operação");
  }
  return res.json();
}

export async function getIndicadores(ticker: string): Promise<Indicadores> {
  const res = await fetch(`${API_URL}/ativos/${ticker}/indicadores`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Ativo não encontrado ou dados insuficientes.");
  return res.json();
}

export async function gerarAnalise(ticker: string): Promise<Analise> {
  const res = await fetch(`${API_URL}/ativos/${ticker}/analisar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Erro ao gerar análise.");
  return res.json();
}

export async function getCotacoes(ticker: string): Promise<Cotacao[]> {
  const res = await fetch(`${API_URL}/ativos/${ticker}/cotacoes?limit=60`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Erro ao buscar histórico de preços.");
  return res.json();
}