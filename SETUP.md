# AVESTRA — Guia de Setup Completo
**Última atualização:** Abril/2026  
**Stack:** Express (Node) + Next.js + PostgreSQL + ChromaDB + Claude API

---

## O QUE JÁ FOI FEITO

### Backend (`/backend`)
- [x] Express server na porta 4000
- [x] Agente Tomy (Copywriter jurídico) com slot-filling — funcional
- [x] **Agente Pesquisador** criado (`/src/agents/pesquisador/`) — usa Claude
- [x] **Agente PetiAI** criado (`/src/agents/petiai/`) — usa Claude
- [x] **Agente ContratAI** criado (`/src/agents/contratai/`) — usa Claude
- [x] SDK da Anthropic instalado (`@anthropic-ai/sdk`)
- [x] Cliente Claude criado em `/src/shared/claude.ts`
- [x] Todos os agentes registrados em `/src/index.ts`
- [x] `backend/.env` configurado com chave Anthropic e credenciais do banco

### Infraestrutura (`/docker-compose.yml`)
- [x] PostgreSQL 16 adicionado (porta 5432)
- [x] ChromaDB adicionado (porta 8000)
- [x] Backend depende do PostgreSQL e ChromaDB
- [x] Volumes persistentes configurados

### Banco de Dados
- [x] Schema SQL existe em `/backend/src/db/migrations/`
- [ ] **Migrations ainda não foram rodadas** (banco vazio — precisa rodar após subir Docker)

---

## CREDENCIAIS CONFIGURADAS

```
Banco PostgreSQL:
  Host:     postgres (interno Docker) / localhost (externo)
  Porta:    5432
  Usuário:  avestra
  Senha:    avestra123
  Banco:    avestra
  URL:      postgresql://avestra:avestra123@postgres:5432/avestra

Anthropic (Claude):
  Chave:    já salva no backend/.env
  Modelo:   claude-sonnet-4-5

ChromaDB:
  URL:      http://chromadb:8000 (interno) / http://localhost:8000 (externo)
```

> ⚠️ A chave Anthropic foi colada no chat — crie uma nova em console.anthropic.com/settings/keys e atualize o backend/.env

---

## ENDPOINTS DISPONÍVEIS APÓS SUBIR

```
GET  http://localhost:4000/health                    → verifica se backend está up

POST http://localhost:4000/api/agents/pesquisador/run   → Pesquisador Jurídico (Claude)
POST http://localhost:4000/api/agents/pesquisador/clear → limpa histórico

POST http://localhost:4000/api/agents/petiai/run        → Redator de Petições (Claude)
POST http://localhost:4000/api/agents/petiai/clear      → limpa histórico

POST http://localhost:4000/api/agents/contratai/run     → Editor de Contratos (Claude)
POST http://localhost:4000/api/agents/contratai/clear   → limpa histórico

POST http://localhost:4000/api/agents/tomy/run          → Copywriter (OpenAI — precisa OPENAI_API_KEY)
POST http://localhost:4000/api/agents/copywriter/run    → alias do Tomy

GET  http://localhost:3000                              → Frontend Next.js
```

### Formato do body para os 3 agentes jurídicos:
```json
{ "query": "sua pergunta aqui" }
```

---

## PASSO A PASSO PARA SUBIR DO ZERO

### PRÉ-REQUISITO: Instalar Docker Desktop

1. Baixe em: **https://www.docker.com/products/docker-desktop**
2. Execute o instalador → clique OK em tudo → reinicie o PC
3. Se pedir WSL 2: abra PowerShell como Administrador e rode:
   ```
   wsl --install
   ```
   Reinicie novamente.
4. Verifique: `docker --version` deve retornar a versão instalada.

---

### PASSO 1 — Subir os containers

Abra o terminal (PowerShell ou CMD) na pasta `teste`:

```powershell
cd "C:\Users\LB-GROUP\Documents\Agência Avestra\Advogado - Wladmir\teste"
docker compose up -d
```

Isso vai criar e subir:
- `postgres` — banco de dados
- `chromadb` — banco vetorial
- `backend` — API Express (porta 4000)
- `frontend` — Next.js (porta 3000)

Aguarde 60 segundos para tudo iniciar.

---

### PASSO 2 — Rodar as migrations (criar tabelas no banco)

```powershell
docker compose exec backend npm run migrate
```

Você deve ver mensagens como:
```
Running migration: 0001_init.sql ... OK
Running migration: 0002_conversations.sql ... OK
...
```

Se der erro de conexão, aguarde mais 30 segundos e tente novamente.

---

### PASSO 3 — Testar se está funcionando

```powershell
# Verificar backend
curl http://localhost:4000/health

# Testar Pesquisador
curl -X POST http://localhost:4000/api/agents/pesquisador/run `
  -H "Content-Type: application/json" `
  -d '{"query": "Qual a posição do STJ sobre dano moral em relação de consumo?"}'
```

Se receber `{"status":"OK","text":"..."}` → tudo funcionando.

---

### PASSO 4 — Acessar o Frontend

Abra o navegador em: **http://localhost:3000**

---

## ESTRUTURA DE ARQUIVOS CRIADOS/ALTERADOS

```
teste/
├── docker-compose.yml              ← ALTERADO: adicionou postgres + chromadb
├── SETUP.md                        ← NOVO: este arquivo
└── backend/
    ├── .env                        ← ALTERADO: postgres URL + chave Anthropic
    ├── package.json                ← ALTERADO: @anthropic-ai/sdk instalado
    └── src/
        ├── index.ts                ← ALTERADO: registrou 3 novos agentes
        ├── shared/
        │   └── claude.ts           ← NOVO: cliente Claude API
        └── agents/
            ├── pesquisador/
            │   ├── persona.ts      ← NOVO: system prompt do Pesquisador
            │   ├── pipeline.ts     ← NOVO: chamada Claude
            │   └── router.ts       ← NOVO: rotas Express
            ├── petiai/
            │   ├── persona.ts      ← NOVO: system prompt do PetiAI
            │   ├── pipeline.ts     ← NOVO: chamada Claude
            │   └── router.ts       ← NOVO: rotas Express
            └── contratai/
                ├── persona.ts      ← NOVO: system prompt do ContratAI
                ├── pipeline.ts     ← NOVO: chamada Claude
                └── router.ts       ← NOVO: rotas Express
```

---

## O QUE AINDA FALTA (PRÓXIMOS PASSOS)

### Prioridade ALTA
- [ ] **Instalar Docker Desktop** e subir os containers
- [ ] Rodar migrations
- [ ] Testar os 3 agentes via curl ou Postman
- [ ] Conectar o frontend aos 3 novos agentes (atualizar `frontend/app/agentes/page.tsx`)
- [ ] Criar nova chave Anthropic (a atual foi exposta no chat)

### Prioridade MÉDIA
- [ ] **Stripe** — integração de pagamentos (R$27/mês e R$1.997/ano)
- [ ] Sistema de tokens (limitar uso por plano)
- [ ] Case Memory — pasta por caso/cliente com contexto compartilhado entre agentes
- [ ] Upload de PDFs para análise (RAG)

### Prioridade BAIXA
- [ ] Trocar OpenAI → Claude no agente Tomy (copywriter)
- [ ] Export de petições/contratos para .docx
- [ ] WhatsApp — rotear agentes jurídicos pelo canal
- [ ] Dashboard de métricas de uso

---

## VARIÁVEIS DE AMBIENTE — ARQUIVO COMPLETO

**`backend/.env`** (atual):
```env
PORT=4000
POSTGRES_URL=postgresql://avestra:avestra123@postgres:5432/avestra
CHROMA_URL=http://chromadb:8000
OPENAI_API_KEY=           ← deixar vazio se não usar Tomy
ANTHROPIC_API_KEY=        ← sua chave aqui (criar nova em console.anthropic.com)
STRIPE_SECRET_KEY=        ← preencher quando for integrar Stripe
STRIPE_WEBHOOK_SECRET=    ← preencher quando for integrar Stripe
DEFAULT_TENANT_ID=00000000-0000-0000-0000-000000000001
```

**`frontend/.env.local`** (verificar se existe):
```env
NEXT_PUBLIC_API_BASE=http://localhost:4000
```

---

## COMANDOS ÚTEIS DO DIA A DIA

```powershell
# Subir tudo
docker compose up -d

# Ver logs do backend em tempo real
docker compose logs -f backend

# Ver logs do frontend
docker compose logs -f frontend

# Parar tudo
docker compose down

# Parar e apagar o banco (CUIDADO — apaga dados)
docker compose down -v

# Entrar no container do backend
docker compose exec backend sh

# Rodar migrations manualmente
docker compose exec backend npm run migrate

# Reiniciar só o backend (após editar código)
docker compose restart backend
```

---

## PROBLEMA COMUM: "Cannot connect to database"

Se o backend logar erro de conexão com o banco:
1. Aguarde 30 segundos — PostgreSQL demora para iniciar
2. Rode: `docker compose logs postgres` para ver se o banco está pronto
3. Rode as migrations: `docker compose exec backend npm run migrate`

## PROBLEMA COMUM: "ANTHROPIC_API_KEY não configurada"

Edite o arquivo `backend/.env` e adicione sua chave.  
Depois reinicie: `docker compose restart backend`
