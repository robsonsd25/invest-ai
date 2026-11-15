\# 📈 INVEST AI



!\[Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge\&logo=nextdotjs\&logoColor=white)

!\[React](https://img.shields.io/badge/React-20232A?style=for-the-badge\&logo=react\&logoColor=61DAFB)

!\[TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge\&logo=typescript\&logoColor=white)

!\[TailwindCSS](https://img.shields.io/badge/Tailwind\_CSS-38B2AC?style=for-the-badge\&logo=tailwind-css\&logoColor=white)



!\[Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge\&logo=python\&logoColor=white)

!\[FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge\&logo=fastapi)

!\[PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge\&logo=postgresql\&logoColor=white)

!\[SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-D71F00?style=for-the-badge\&logo=sqlalchemy\&logoColor=white)



> Plataforma web de inteligência, análise técnica e simulação de investimentos para os mercados brasileiro (B3) e norte-americano (NYSE/NASDAQ).



🔗 \*\*Acesse o projeto online:\*\* \[INVEST AI (Vercel)](https://invest-ai-frontend-robsonsd25.vercel.app) \*(Substitua pelo link real do seu deploy)\*



\---



\## 📖 Sobre o Projeto



O \*\*INVEST AI\*\* foi criado para ser uma ferramenta de apoio à decisão e gestão de investimentos. O sistema permite que usuários simulem operações de compra e venda de ações, acompanhem indicadores técnicos calculados de forma determinística e recebam sinais de mercado explicáveis.



\*\*⚠️ Importante:\*\* Este sistema opera \*\*exclusivamente em modo de simulação e análise\*\*. Nenhuma ordem real é enviada a corretoras, e nenhum dinheiro real é movimentado. O objetivo é estudar o mercado e testar estratégias com capital virtual.



\---



\## ✨ Funcionalidades



\- \*\*🔐 Autenticação Segura:\*\* Cadastro, login com token JWT, validação de e-mail e recuperação de senha.

\- \*\*💼 Multi-usuário:\*\* Cada usuário possui seu próprio "cofre" com 3 carteiras isoladas (Conservador, Moderado, Agressivo), iniciando com R$ 5.000,00 virtuais cada.

\- \*\*📊 Dashboard de Carteiras:\*\* Acompanhamento de saldo disponível e posições (ações em custódia).

\- \*\*📈 Cálculo de P\&L:\*\* Lucro/Prejuízo (Profit \& Loss) calculado em tempo real cruzando o custo médio com a cotação mais recente.

\- \*\*🛡️ Gestão de Risco:\*\* Trava no backend que bloqueia operações que ultrapassem o limite de exposição do perfil (ex: Conservador até 40%), com barra visual no frontend.

\- \*\*🧠 Motor de Análise (IA Determinística):\*\* Cálculo de indicadores técnicos (RSI, MACD, SMA, EMA) e geração de sinais (COMPRA, VENDA, MANUTENÇÃO) com justificativas auditáveis.

\- \*\*🎯 Radar de Oportunidades:\*\* Varredura automática em todos os ativos do banco, classificando-os em oportunidades de compra, venda ou neutros.

\- \*\*🕯️ Gráficos Financeiros:\*\* Histórico de preços com gráficos de Candlestick (via ApexCharts).

\- \*\*📰 Módulo de Notícias:\*\* Importação e exibição de notícias do mercado financeiro via RSS.

\- \*\*🎨 UI/UX Profissional:\*\* Tema escuro, responsividade mobile, \*Skeletons\* de carregamento, notificações \*Toast\* e alinhamento numérico tabular.



\---



\## 🛠️ Tecnologias Utilizadas



\*\*Backend:\*\*

\- Python 3.13

\- FastAPI

\- SQLAlchemy (ORM) + Alembic (Migrações)

\- PostgreSQL

\- Passlib (Criptografia de senhas) + Python-JOSE (JWT)

\- Pandas (Cálculo de indicadores)

\- Feedparser (RSS) + yfinance (Importação de cotações)



\*\*Frontend:\*\*

\- Next.js 15 (App Router)

\- React + TypeScript

\- Tailwind CSS

\- ApexCharts (Gráficos)

\- React Hot Toast (Notificações)



\*\*Infraestrutura (Deploy):\*\*

\- \*\*Banco de Dados:\*\* Neon (PostgreSQL Serverless)

\- \*\*Backend:\*\* Render

\- \*\*Frontend:\*\* Vercel



\---



\## 🚀 Como Executar o Projeto Localmente



\### Pré-requisitos

\- Python 3.13+

\- Node.js 20+

\- PostgreSQL instalado e rodando



\### 1. Clonar o repositório

```bash

git clone https://github.com/robsonsd25/invest-ai.git

cd invest-ai

