const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ==========================================
// FUNCOES DE AUTENTICACAO
// ==========================================
export function getToken() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("investai_token");
  }
  return null;
}

export function setToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("investai_token", token);
  }
}

export function removeToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("investai_token");
  }
}

export async function login(email: string, senha: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  });
  if (!res.ok) {
    const erro = await res.json();
    throw new Error(erro.detail || "Erro ao fazer login.");
  }
  return res.json();
}

export async function registrar(nome: string, email: string, senha: string) {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, email, senha }),
  });
  if (!res.ok) {
    const erro = await res.json();
    throw new Error(erro.detail || "Erro ao registrar.");
  }
  return res.json();
}

export async function resetPassword(email: string, novaSenha: string) {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, nova_senha: novaSenha }),
  });
  if (!res.ok) {
    const erro = await res.json();
    throw new Error(erro.detail || "Erro ao redefinir a senha.");
  }
  return res.json();
}

// ==========================================
// INTERFACES DE DADOS
// ==========================================
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
  preco_atual: number;
  valor_atual: number;
  lucro_prejuizo: number;
  rentabilidade_pct: number;
}

export interface CarteiraDetalhe {
  carteira_id: number;
  nome: string;
  saldo_caixa: number;
  capital_inicial: number;
  max_exposicao_pct: number;
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

export interface RadarItem {
  ticker: string;
  nome: string;
  mercado: string;
  fechamento: number;
  sinal: string;
  justificativa: string;
}

export interface RadarResultado {
  compra: RadarItem[];
  venda: RadarItem[];
  manutencao: RadarItem[];
}

export interface OperacaoExtrato {
  id: number;
  ticker: string;
  nome_ativo: string;
  tipo: string;
  quantidade: string;
  preco_unitario: string;
  custos: string;
  executada_em: string;
  origem: string;
}

export interface Noticia {
  id: number;
  titulo: string;
  url: string;
  resumo: string;
  publicado_em: string;
  fonte_nome: string | null;
}

// ==========================================
// FUNCOES DE DADOS
// ==========================================
function getAuthHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getCarteiras(): Promise<Carteira[]> {
  const res = await fetch(`${API_URL}/carteiras`, { headers: getAuthHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error("Erro ao buscar carteiras");
  return res.json();
}

export async function getPosicoes(carteiraId: string | number): Promise<CarteiraDetalhe> {
  const res = await fetch(`${API_URL}/carteiras/${carteiraId}/posicoes`, { headers: getAuthHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error("Erro ao buscar posicoes");
  return res.json();
}

export async function executarOperacao(carteiraId: string | number, dados: OperacaoPayload) {
  const res = await fetch(`${API_URL}/carteiras/${carteiraId}/operacoes`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(dados),
  });
  if (!res.ok) {
    const erro = await res.json();
    throw new Error(erro.detail || "Erro ao executar operação");
  }
  return res.json();
}

export async function getIndicadores(ticker: string): Promise<Indicadores> {
  const res = await fetch(`${API_URL}/ativos/${ticker}/indicadores`, { headers: getAuthHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error("Ativo não encontrado ou dados insuficientes.");
  return res.json();
}

export async function gerarAnalise(ticker: string): Promise<Analise> {
  const res = await fetch(`${API_URL}/ativos/${ticker}/analisar`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Erro ao gerar análise.");
  return res.json();
}

export async function getCotacoes(ticker: string): Promise<Cotacao[]> {
  const res = await fetch(`${API_URL}/ativos/${ticker}/cotacoes?limit=60`, { headers: getAuthHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error("Erro ao buscar histórico de preços.");
  return res.json();
}

export async function getRadar(): Promise<RadarResultado> {
  const res = await fetch(`${API_URL}/radar`, { headers: getAuthHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error("Erro ao carregar o radar.");
  return res.json();
}

export async function getExtrato(carteiraId: string | number): Promise<OperacaoExtrato[]> {
  const res = await fetch(`${API_URL}/carteiras/${carteiraId}/extrato`, { headers: getAuthHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error("Erro ao carregar o extrato.");
  return res.json();
}

export async function getNoticias(): Promise<Noticia[]> {
  const res = await fetch(`${API_URL}/noticias`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Erro ao buscar notícias");
  return res.json();
}