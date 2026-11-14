-- ============================================================
-- INVEST AI - Schema inicial
-- Fase: analise e simulacao (sem ordens reais)
-- Idempotente: pode ser reexecutado sem duplicar tabelas.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Dominios fixos
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS mercados (
    id              SMALLSERIAL PRIMARY KEY,
    codigo          VARCHAR(20)  NOT NULL UNIQUE,
    nome            VARCHAR(100) NOT NULL,
    pais            VARCHAR(2)   NOT NULL,
    moeda           VARCHAR(3)   NOT NULL,
    fuso_horario    VARCHAR(50)  NOT NULL,
    ativo           BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tipos_ativo (
    id       SMALLSERIAL PRIMARY KEY,
    codigo   VARCHAR(20) NOT NULL UNIQUE,
    nome     VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS perfis_risco (
    id                    SMALLSERIAL PRIMARY KEY,
    codigo                VARCHAR(20)  NOT NULL UNIQUE,
    nome                  VARCHAR(50)  NOT NULL,
    descricao             TEXT,
    capital_inicial_brl   NUMERIC(12,2) NOT NULL DEFAULT 5000.00,
    max_perda_diaria_pct  NUMERIC(5,2)  NOT NULL DEFAULT 2.00,
    max_drawdown_pct      NUMERIC(5,2)  NOT NULL DEFAULT 10.00,
    max_exposicao_pct     NUMERIC(5,2)  NOT NULL DEFAULT 50.00,
    criado_em             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. Ativos e cotacoes
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ativos (
    id           SERIAL PRIMARY KEY,
    ticker       VARCHAR(20)  NOT NULL,
    nome         VARCHAR(200) NOT NULL,
    mercado_id   SMALLINT NOT NULL REFERENCES mercados(id),
    tipo_id      SMALLINT REFERENCES tipos_ativo(id),
    setor        VARCHAR(100),
    ativo        BOOLEAN     NOT NULL DEFAULT TRUE,
    criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (ticker, mercado_id)
);

CREATE INDEX IF NOT EXISTS idx_ativos_ticker ON ativos (ticker);

CREATE TABLE IF NOT EXISTS cotacoes (
    id           BIGSERIAL PRIMARY KEY,
    ativo_id     INTEGER NOT NULL REFERENCES ativos(id) ON DELETE CASCADE,
    data         DATE NOT NULL,
    abertura     NUMERIC(18,6),
    maxima       NUMERIC(18,6),
    minima       NUMERIC(18,6),
    fechamento   NUMERIC(18,6),
    volume       BIGINT,
    fonte        VARCHAR(50),
    criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (ativo_id, data)
);

CREATE INDEX IF NOT EXISTS idx_cotacoes_ativo_data
    ON cotacoes (ativo_id, data DESC);

-- ------------------------------------------------------------
-- 3. Noticias e fontes
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fontes (
    id      SMALLSERIAL PRIMARY KEY,
    nome    VARCHAR(100) NOT NULL UNIQUE,
    url     VARCHAR(500),
    tipo    VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS noticias (
    id           BIGSERIAL PRIMARY KEY,
    fonte_id     SMALLINT REFERENCES fontes(id),
    titulo       VARCHAR(500) NOT NULL,
    url          VARCHAR(1000) UNIQUE,
    resumo       TEXT,
    publicado_em TIMESTAMPTZ NOT NULL,
    coletado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_noticias_publicado
    ON noticias (publicado_em DESC);

-- ------------------------------------------------------------
-- 4. Carteiras e operacoes simuladas
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS carteiras (
    id              SERIAL PRIMARY KEY,
    perfil_id       SMALLINT NOT NULL REFERENCES perfis_risco(id),
    nome            VARCHAR(100) NOT NULL,
    capital_inicial NUMERIC(12,2) NOT NULL,
    saldo_caixa     NUMERIC(12,2) NOT NULL,
    moeda           VARCHAR(3)   NOT NULL DEFAULT 'BRL',
    ativa           BOOLEAN      NOT NULL DEFAULT TRUE,
    criada_em       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operacoes_simuladas (
    id              BIGSERIAL PRIMARY KEY,
    carteira_id     INTEGER NOT NULL REFERENCES carteiras(id) ON DELETE CASCADE,
    ativo_id        INTEGER NOT NULL REFERENCES ativos(id),
    tipo            VARCHAR(10) NOT NULL CHECK (tipo IN ('COMPRA','VENDA')),
    quantidade      NUMERIC(18,6) NOT NULL CHECK (quantidade > 0),
    preco_unitario  NUMERIC(18,6) NOT NULL CHECK (preco_unitario > 0),
    custos          NUMERIC(12,2) NOT NULL DEFAULT 0,
    executada_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    origem          VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    observacao      TEXT
);

CREATE INDEX IF NOT EXISTS idx_ops_carteira_data
    ON operacoes_simuladas (carteira_id, executada_em DESC);
CREATE INDEX IF NOT EXISTS idx_ops_ativo
    ON operacoes_simuladas (ativo_id);

-- ------------------------------------------------------------
-- 5. Analises e limites de risco
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS analises (
    id              BIGSERIAL PRIMARY KEY,
    ativo_id        INTEGER NOT NULL REFERENCES ativos(id),
    estrategia      VARCHAR(30) NOT NULL CHECK (estrategia IN ('DAY_TRADE','SWING_TRADE','BUY_HOLD')),
    sinal           VARCHAR(20) NOT NULL CHECK (sinal IN ('COMPRA','VENDA','MANUTENCAO')),
    justificativa   TEXT NOT NULL,
    versao_modelo   VARCHAR(20) NOT NULL,
    gerada_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    validada        BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_analises_ativo_data
    ON analises (ativo_id, gerada_em DESC);

CREATE TABLE IF NOT EXISTS limites_risco (
    id                   SERIAL PRIMARY KEY,
    perfil_id            SMALLINT NOT NULL REFERENCES perfis_risco(id),
    max_exposicao_pct    NUMERIC(5,2) NOT NULL,
    max_perda_diaria_pct NUMERIC(5,2) NOT NULL,
    max_drawdown_pct     NUMERIC(5,2) NOT NULL,
    ativo                BOOLEAN      NOT NULL DEFAULT TRUE,
    criado_em            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 6. Dados iniciais (seed) - idempotente
-- ------------------------------------------------------------

INSERT INTO mercados (codigo, nome, pais, moeda, fuso_horario) VALUES
    ('B3',     'B3 - Brasil Bolsa Balcao', 'BR', 'BRL', 'America/Sao_Paulo'),
    ('NYSE',   'New York Stock Exchange',  'US', 'USD', 'America/New_York'),
    ('NASDAQ', 'NASDAQ',                   'US', 'USD', 'America/New_York')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO tipos_ativo (codigo, nome) VALUES
    ('ACAO', 'Acao'),
    ('FII',  'Fundo de Investimento Imobiliario'),
    ('ETF',  'Exchange Traded Fund'),
    ('BDR',  'Brazilian Depositary Receipt')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO perfis_risco
    (codigo, nome, descricao, capital_inicial_brl,
     max_perda_diaria_pct, max_drawdown_pct, max_exposicao_pct)
VALUES
    ('CONSERVADOR', 'Conservador',
     'Prioridade a preservacao de capital e menor volatilidade.',
     5000.00, 1.00, 5.00, 40.00),
    ('MODERADO', 'Moderado',
     'Equilibrio entre risco e potencial de retorno.',
     5000.00, 2.00, 10.00, 60.00),
    ('AGRESSIVO', 'Agressivo',
     'Maior tolerancia a volatilidade, com limites de perda definidos.',
     5000.00, 3.00, 20.00, 80.00)
ON CONFLICT (codigo) DO NOTHING;