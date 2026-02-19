# Infraestrutura de Automação SaaS - Chargebacks

**Versão**: 1.0  
**Data**: 2026-02-19  
**Stack**: Next.js 15 + PostgreSQL/Supabase + n8n + Claude API

---

## 📋 Índice

1. [Overview](#overview)
2. [Arquitetura](#arquitetura)
3. [Setup Inicial](#setup-inicial)
4. [Configuração de Componentes](#configuração-de-componentes)
5. [Deployment](#deployment)
6. [Troubleshooting](#troubleshooting)
7. [Segurança](#segurança)
8. [Próximas Etapas](#próximas-etapas)

---

## Overview

Este projeto implementa uma infraestrutura completa para **automação end-to-end de chargebacks** usando:

- **PostgreSQL/Supabase**: Persistência de dados (chargebacks, orders, defenses, logs)
- **n8n Cloud**: Orquestração de workflows (automação visual)
- **Claude API**: Análise jurídica com triagem (Haiku) + redação (Sonnet)
- **Pagar.me Webhooks**: Notificações de chargebacks em tempo real
- **Shopify API**: Enriquecimento de dados de pedidos (opcional)
- **LinkeTrack API**: Rastreamento de entregas (opcional)

**Antes**: Dados salvos apenas em `localStorage` (MVP)  
**Depois**: Infraestrutura profissional com banco de dados, automação, e análise jurídica

---

## Arquitetura

### Fluxo Completo

```
Chargeback ocorre no Pagar.me
         ↓
Webhook enviado → n8n Cloud (validado com HMAC SHA-256)
         ↓
Buscar dados completos:
├─ Pagar.me API (transaction details)
├─ Shopify API (order enrichment)
└─ LinkeTrack API (rastreio)
         ↓
PostgreSQL/Supabase:
├─ chargebacks (disputa principal)
├─ orders (dados do cliente)
├─ webhook_logs (auditoria)
└─ defenses (rascunho jurídico)
         ↓
Claude Triagem (Haiku):
└─ Classificar tipo + viabilidade
         ↓
Notificações (Email + Slack):
└─ Alertar admin
         ↓
Claude Redação (Sonnet):
└─ Gerar parecer jurídico completo com base legal
         ↓
Email para cliente:
└─ Dossiê PDF pronto para revisar
         ↓
[Manual Review] → Usuário envia para Pagar.me
```

### Tabelas PostgreSQL

| Tabela | Função | Índices |
|--------|--------|---------|
| `chargebacks` | Disputas recebidas | chargeback_id, order_id, status, created_at |
| `orders` | Dados de transação + cliente | order_id, customer_email, created_at |
| `webhook_logs` | Auditoria de webhooks | event_type, created_at, processed |
| `defenses` | Rascunhos jurídicos | chargeback_id, status, viability_score |
| `notifications` | Histórico de notificações | chargeback_id, type, status, created_at |

---

## Setup Inicial

### ✅ Pré-requisitos

- [ ] Conta Supabase (https://supabase.com) - PostgreSQL gerenciado
- [ ] Conta n8n Cloud (https://cloud.n8n.io) - Orquestração
- [ ] API Key Pagar.me v5
- [ ] API Key Anthropic (Claude)
- [ ] (Opcional) API Token Shopify
- [ ] (Opcional) Token LinkeTrack
- [ ] Servidor SMTP (para envio de emails)
- [ ] Node.js 18+ instalado localmente

---

## Configuração de Componentes

### 1. Supabase (PostgreSQL)

#### 1.1 Criar Projeto

1. Acesse https://app.supabase.com
2. Clique em "New project"
3. Configure:
   - **Organização**: Sua org
   - **Project name**: `contestacao-prod`
   - **Database password**: Gere uma senha forte
   - **Region**: Escolha mais próximo (ex: `sa-east-1` para Brasil)
4. Aguarde criação (5-10 min)

#### 1.2 Executar Schema

1. No dashboard Supabase, vá para **SQL Editor**
2. Clique em "New Query"
3. Copie e cole o conteúdo de `schema.sql`
4. Clique em "Run"
5. Verifique se todas as tabelas foram criadas

```bash
# Ou via CLI (local):
psql "postgresql://postgres:[PASSWORD]@db.[REGION].supabase.co:5432/postgres" < schema.sql
```

#### 1.3 Obter Credenciais

1. Vá para **Settings** → **Database**
2. Copie:
   - **Connection string** (URI): `postgresql://...` → salve em `.env.local` como `DATABASE_URL`
3. Vá para **Settings** → **API**
4. Copie:
   - **Project URL**: `https://[PROJECT_ID].supabase.co`
   - **Anon Key**: `eyJhbGc...` → `SUPABASE_ANON_KEY`
   - **Service Role Key**: `eyJhbGc...` (com mais permissões) → `SUPABASE_SERVICE_ROLE_KEY`

#### 1.4 Segurança

1. Vá para **Auth** → **Policies**
2. Configure Row-Level Security (RLS) se necessário:
   - `chargebacks`: Apenas admin pode ler/escrever
   - `orders`: Apenas admin pode ler
   - `webhook_logs`: Apenas sistema pode escrever
3. Teste uma query simples:

```sql
SELECT * FROM chargebacks LIMIT 1;
```

---

### 2. Pagar.me Webhooks

#### 2.1 Obter Credenciais

1. Acesse https://dashboard.pagar.me
2. Vá para **Configurações** → **Chaves de API**
3. Copie:
   - **Chave Pública**: `pk_live_...`
   - **Chave Privada**: `sk_live_...` → `.env.local` como `PAGARME_API_KEY`

#### 2.2 Webhook Secret

1. Vá para **Configurações** → **Webhooks**
2. Se houver webhook existente, clique para ver o **Secret**
3. Copie o secret (formato `whsec_...`) → `.env.local` como `PAGARME_WEBHOOK_SECRET`

#### 2.3 Registrar Webhook via Script

1. Configure `.env.local`:

```bash
PAGARME_API_KEY=sk_live_...
PAGARME_WEBHOOK_SECRET=whsec_...
PAGARME_WEBHOOK_URL=https://cloud.n8n.io/webhook/... # Obteremos após setup n8n
```

2. Registre webhook:

```bash
node scripts/webhook-register.js
```

**Output esperado**:
```
✓ Webhook registered successfully!
  ID: hook_xxxxx
  URL: https://cloud.n8n.io/webhook/...
  Status: active
  
✓ Updated .env.local with webhook ID
```

3. Salve o webhook ID gerado em `.env.local`:

```bash
PAGARME_WEBHOOK_ID=hook_xxxxx
```

---

### 3. n8n Cloud

#### 3.1 Criar Conta e Setup Inicial

1. Acesse https://cloud.n8n.io
2. Crie conta (ou faça login)
3. Crie um novo workflow:
   - **Name**: "Automação de Chargeback"
   - **Description**: "Triagem + redação jurídica automática"

#### 3.2 Importar Workflow

1. No dashboard n8n, clique em **Import**
2. Selecione **From file** e escolha `n8n/workflow-automacao-chargeback.json`
3. Clique em **Import**
4. Você verá todos os nós do workflow

#### 3.3 Configurar Credenciais

**Nó: Webhook Trigger**
- URL do webhook será gerada automaticamente (ex: `https://cloud.n8n.io/webhook/[id]/chargeback-webhook`)
- Copie esta URL → `.env.local` como `PAGARME_WEBHOOK_URL`
- Depois registre webhook no Pagar.me (via script acima)

**Nó: HTTP - Pagar.me**
- Authentication: Basic Auth
- Username: `{{ env.PAGARME_API_KEY }}`
- Password: (deixe vazio)

**Nó: HTTP - Shopify** (opcional)
- Authentication: Bearer Token
- Token: `{{ env.SHOPIFY_API_ACCESS_TOKEN }}`

**Nó: HTTP - Claude**
- Authentication: Bearer Token
- Token: `{{ env.ANTHROPIC_API_KEY }}`

**Nó: PostgreSQL**
- Connection: New
- Host: `db.[REGION].supabase.co`
- Port: `5432`
- User: `postgres`
- Password: Sua senha Supabase
- Database: `postgres`
- SSL: **Enabled**

**Nó: Email Send**
- SMTP Configuration:
  - Host: `{{ env.SMTP_HOST }}`
  - Port: `{{ env.SMTP_PORT }}`
  - User: `{{ env.SMTP_USER }}`
  - Password: `{{ env.SMTP_PASSWORD }}`

**Nó: Slack**
- Webhook URL: `{{ env.SLACK_WEBHOOK_URL }}`

#### 3.4 Testar Workflow

1. Clique em **Test Workflow**
2. Na aba "Executions", veja o resultado de cada nó
3. Verifique PostgreSQL:

```sql
SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 1;
SELECT * FROM chargebacks ORDER BY created_at DESC LIMIT 1;
```

#### 3.5 Ativar Workflow

1. Clique em **Save and Activate**
2. Status deve mostrar "Active" (verde)
3. Aguarde notificação do webhook do Pagar.me

---

### 4. Claude API (Anthropic)

#### 4.1 Obter API Key

1. Acesse https://console.anthropic.com/account/keys
2. Clique em "Create Key"
3. Nomeie (ex: "n8n-chargeback")
4. Copie → `.env.local` como `ANTHROPIC_API_KEY`

#### 4.2 Configurar Modelos

`.env.local`:
```bash
CLAUDE_TRIAGE_MODEL=claude-haiku-4-5-20251001
CLAUDE_LEGAL_MODEL=claude-3-5-sonnet-20241022
```

#### 4.3 Testar

```bash
# Via curl (local):
curl https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -d '{"model":"claude-haiku-4-5-20251001","max_tokens":100,"messages":[{"role":"user","content":"Oi"}]}'
```

---

### 5. Shopify (Opcional)

#### 5.1 Obter Access Token

1. Acesse seu admin Shopify: `https://your-store.myshopify.com/admin`
2. Vá para **Apps and integrations** → **Develop apps**
3. Clique em **Create an app**
4. Configure:
   - **App name**: `Contestacao SaaS`
   - **App admin**: Escolha sua role
5. Vá para **Configuration**
6. Ative os seguintes escopos:
   - `read_orders`
   - `read_products`
   - `read_fulfillments`
7. Clique em **Install app**
8. Vá para **Credentials**
9. Copie **Access Token** → `.env.local` como `SHOPIFY_API_ACCESS_TOKEN`

#### 5.2 Configurar

`.env.local`:
```bash
SHOPIFY_API_ACCESS_TOKEN=shpat_...
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_API_VERSION=2024-10
ENABLE_SHOPIFY=true
```

---

### 6. LinkeTrack (Opcional)

#### 6.1 Obter Token

1. Acesse https://app.linketrack.com
2. Vá para **Configurações** → **Integrações**
3. Procure por **API Token**
4. Copie → `.env.local` como `LINKETRACK_API_TOKEN`

#### 6.2 Configurar

`.env.local`:
```bash
LINKETRACK_API_TOKEN=token_...
ENABLE_LINKETRACK=true
```

---

### 7. Email (SMTP)

#### 7.1 Configurar Servidor SMTP

**Opção 1: Seu próprio servidor**

```bash
SMTP_HOST=mail.seu-dominio.com
SMTP_PORT=587
SMTP_USER=noreply@seu-dominio.com
SMTP_PASSWORD=sua_senha
SMTP_FROM=noreply@seu-dominio.com
SMTP_FROM_NAME=Contestação SaaS
```

**Opção 2: Sendgrid (recomendado)**

1. Crie conta em https://sendgrid.com
2. Vá para **API Keys**
3. Gere uma chave
4. Configure:

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxx...
SMTP_FROM=noreply@seu-dominio.com
```

#### 7.2 Testar

```bash
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
});
transporter.verify((err, ok) => {
  console.log(ok ? 'SMTP OK' : 'SMTP Error: ' + err.message);
});
"
```

---

### 8. Slack (Opcional)

#### 8.1 Criar Incoming Webhook

1. Acesse seu workspace Slack
2. Vá para https://api.slack.com/apps
3. Clique em **Create New App** → **From scratch**
4. Configure:
   - **App name**: `Contestacao Webhooks`
   - **Workspace**: Seu workspace
5. Vá para **Incoming Webhooks**
6. Clique em **Add New Webhook to Workspace**
7. Selecione canal (ex: `#chargebacks`)
8. Clique em **Allow**
9. Copie a URL → `.env.local` como `SLACK_WEBHOOK_URL`

#### 8.2 Testar

```bash
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Teste"}' \
  $SLACK_WEBHOOK_URL
```

---

## Deployment

### Opção 1: Supabase + n8n Cloud (Recomendado)

**Vantagens**: Sem DevOps, escalável, gerenciado

1. ✅ Supabase já está em produção
2. ✅ n8n Cloud já está em produção
3. ✅ Webhooks configurados
4. ✅ Credenciais no `.env.local` (não commite!)

**Verificação de saúde**:

```bash
# 1. Testar PostgreSQL
psql $DATABASE_URL -c "SELECT 1;"

# 2. Testar Pagar.me
curl https://api.pagar.me/core/v5/webhooks \
  -H "Authorization: Basic $(echo -n "$PAGARME_API_KEY:" | base64)"

# 3. Testar n8n (via UI)
# Acesse https://cloud.n8n.io → Seu workflow → Status

# 4. Testar Claude
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-haiku-4-5-20251001","max_tokens":10,"messages":[{"role":"user","content":"ok"}]}'
```

### Opção 2: Self-Hosted n8n (Avançado)

Se preferir rodar n8n localmente:

```bash
# 1. Install n8n
npm install -g n8n

# 2. Start
n8n start --tunnel

# 3. Acesse http://localhost:5678
```

---

## Troubleshooting

### Webhook não está recebendo eventos

**Verificar**:
1. Webhook registrado em Pagar.me?
   ```bash
   node scripts/webhook-register.js # Verificar output
   ```
2. URL do webhook está correta?
   ```bash
   # No n8n Cloud, copie a URL do nó Webhook Trigger
   # Deve começar com https://cloud.n8n.io/webhook/
   ```
3. HMAC SHA-256 está válido?
   ```bash
   # Verificar no n8n: Execution logs → "Code - Validar HMAC"
   # Deve mostrar valid: true
   ```
4. Pagar.me enviou webhook?
   - Crie um chargeback de teste no sandbox Pagar.me
   - Verifique em Pagar.me Dashboard → Webhooks → Delivery logs

### PostgreSQL connection refused

**Verificar**:
1. DATABASE_URL está correto?
   ```bash
   echo $DATABASE_URL # Deve mostrar postgresql://...
   ```
2. Supabase está ativo?
   - Acesse https://app.supabase.com → Seu projeto → Status
3. IP está na whitelist?
   - Supabase → Settings → Database → Firewall
   - Adicione seu IP (se fora da nuvem)

### Claude não está respondendo

**Verificar**:
1. API Key está válida?
   ```bash
   echo $ANTHROPIC_API_KEY # Não deve estar vazio
   ```
2. Cota não foi excedida?
   - Acesse https://console.anthropic.com/account/billing
3. Modelo nome está correto?
   ```bash
   # Deve ser: claude-haiku-4-5-20251001 ou claude-3-5-sonnet-20241022
   ```

### Email não está sendo enviado

**Verificar**:
1. Credenciais SMTP estão corretas?
   ```bash
   node -e "require('dotenv').config(); console.log(process.env.SMTP_HOST, process.env.SMTP_PORT);"
   ```
2. Firewall permite porta 587 ou 465?
3. Email pode ir para spam?
   - Verifique pasta Spam/Lixo

### n8n workflow falha

**Verificar**:
1. Acesse https://cloud.n8n.io → Seu workflow
2. Clique em **Executions**
3. Clique na execução com erro (vermelho)
4. Veja exatamente qual nó falhou
5. Clique naquele nó → veja a mensagem de erro
6. Corrija variáveis de ambiente ou credenciais

---

## Segurança

### 🔐 Boas Práticas

1. **Nunca commite `.env.local` ou credenciais**
   - Use `.env.example` como template
   - Adicione `.env.local` ao `.gitignore`

2. **HMAC SHA-256 é validado**
   - Webhook Log mostra `signature_valid: true/false`
   - Se falhar, webhook é rejeitado (status 401)

3. **PostgreSQL com SSL**
   - Supabase força SSL por padrão
   - Não use `sslmode=disable`

4. **API Keys rotacionadas regularmente**
   - Crie nova key antes de apagar a antiga
   - Arquive keys antigas por 30 dias

5. **Dados sensíveis no PostgreSQL**
   - CPF: Não armazenar completo (usar últimos 4 dígitos)
   - Cartão: Apenas últimos 4 dígitos + bandeira
   - Senhas: Nunca armazenar

6. **Logs de webhook mantêm dados brutos**
   - Limpar a cada 30 dias (já configurado em schema.sql)
   - Não incluem dados sensíveis (apenas metadados)

---

## Próximas Etapas

### Fase 1: Validação (Semana 1)
- [ ] Schema PostgreSQL criado em Supabase
- [ ] Webhook registrado na Pagar.me
- [ ] n8n workflow importado e ativado
- [ ] Primeira execução com dados de teste
- [ ] PostgreSQL validado com dados

### Fase 2: Otimização (Semana 2)
- [ ] Testar com chargebacks reais
- [ ] Ajustar system prompt de Claude (se necessário)
- [ ] Testar todas as notificações (email, Slack)
- [ ] Validar template PDF

### Fase 3: Integração Next.js (Opcional)
- [ ] Criar `/api/gerar-dossie` (usar dados PostgreSQL)
- [ ] Criar `/api/exportar-pdf` (renderizar template)
- [ ] Atualizar Dashboard para mostrar defenses
- [ ] Integrar com localStorage existente

### Fase 4: Produção (Semana 3-4)
- [ ] Testar sob carga (simular 100 chargebacks)
- [ ] Documentação final
- [ ] Treinamento da equipe
- [ ] Monitoramento 24/7 (status page)
- [ ] SLA de resposta (notificação em < 5 min)

---

## Contato & Suporte

- **Documentação Pagar.me**: https://docs.pagar.me
- **Documentação n8n**: https://docs.n8n.io
- **Documentação Supabase**: https://supabase.com/docs
- **Documentação Claude**: https://docs.anthropic.com
- **Issues**: Abra issue no repositório GitHub

---

## Changelog

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.0 | 2026-02-19 | Versão inicial - Setup completo |

---

**Versão:** 1.0 | **Data**: 2026-02-19 | **Status**: ✅ Pronto para Implementação
