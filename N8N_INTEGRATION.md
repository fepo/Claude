# Integração n8n ↔ Dashboard Next.js

## Fluxo Geral

```
Webhook Pagar.me
    ↓
Next.js: POST /api/pagarme/chargebacks
    ├─ Valida HMAC
    ├─ Salva rascunho em localStorage
    └─ Retorna 200 ✓
    ↓
[Simultaneamente: n8n recebe via Webhook Trigger]
    ├─ Valida HMAC
    ├─ Busca dados enriquecidos (Pagar.me, Shopify, LinkeTrack)
    ├─ Claude Triagem (Haiku): classificação + viabilidade
    ├─ Claude Redação (Sonnet): parecer jurídico completo
    └─ Salva defesa via: POST /api/defesas/salvar
    ↓
Dashboard (usuário):
    ├─ Vê chargeback criado
    ├─ Revisa defesa gerada automaticamente
    ├─ Clica "Enviar Defesa" ou "Rejeitar"
    └─ POST /api/defesas/aprovar (se approved)
    ↓
Pagar.me:
    ├─ Recebe resposta de chargeback
    └─ Avalia contestação
```

---

## Endpoints Next.js para n8n

### 1. **POST /api/defesas/salvar**

**Usado por**: n8n (após gerar dossiê)

**Request**:
```json
{
  "contestacaoId": "cb_xxxxx",
  "chargebackId": "charge_xxxxx",
  "dossie": "HTML do dossiê",
  "dossieTitulo": "Dossiê de Defesa - Chargeback XYZ",
  "dossieMD": "# Dossiê\n\n## Seção 1\n...",
  "contestacao": {
    "gateway": "pagarme",
    "tipoContestacao": "produto_nao_recebido",
    "valorTransacao": "150.00",
    "nomeCliente": "João Silva",
    "emailCliente": "joao@example.com",
    // ... outros campos FormContestacao
  },
  "parecer": {
    "tipo": "produto_nao_recebido",
    "viabilidade": 0.85,
    "parecer": "Análise jurídica completa do parecer...",
    "argumentos": [
      "Rastreamento confirma entrega",
      "Data de entrega anterior ao chargeback",
      "Cliente não apresentou prova de não recebimento"
    ],
    "recomendacao": "responder",
    "confianca": 0.92
  },
  "shopifyData": {
    "orderId": "#1001",
    "fulfillmentStatus": "fulfilled",
    "financialStatus": "paid",
    "trackingInfo": {
      "number": "BR123456789",
      "company": "Correios",
      "url": "https://rastreamento.correios.com.br/..."
    }
  },
  "source": "n8n"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "defesaId": "def_xxxxx",
  "contestacaoId": "cb_xxxxx",
  "chargebackId": "charge_xxxxx",
  "status": "drafted",
  "message": "Defesa salva como rascunho. Aguardando aprovação do usuário.",
  "dashboardUrl": "/defesa/def_xxxxx"
}
```

**O que faz**:
- ✓ Salva defesa completa em localStorage
- ✓ Marca como `drafted` (aguardando revisão)
- ✓ Inclui parecer jurídico do Claude
- ✓ Inclui dados Shopify enriquecidos
- ✓ Registra que veio do n8n

---

### 2. **POST /api/defesas/webhook**

**Usado por**: n8n (notificações de status)

**Request A - Defesa Gerada**:
```json
{
  "type": "defesa_gerada",
  "chargebackId": "charge_xxxxx",
  "defesaId": "def_xxxxx",
  "payload": {
    "tipo": "produto_nao_recebido",
    "viabilidade": 0.85,
    "recomendacao": "responder"
  },
  "timestamp": "2025-02-19T10:30:00Z",
  "signature": "hmac_sha256_signature"
}
```

**Request B - Erro na Geração**:
```json
{
  "type": "defesa_erro",
  "chargebackId": "charge_xxxxx",
  "payload": {
    "error": "Claude API timeout",
    "errorStack": "..."
  },
  "timestamp": "2025-02-19T10:30:00Z"
}
```

**Request C - Chargeback Atualizado**:
```json
{
  "type": "chargeback_atualizado",
  "chargebackId": "charge_xxxxx",
  "payload": {
    "status": "won",
    "result": "Chargeback ganho!"
  },
  "timestamp": "2025-02-19T10:30:00Z"
}
```

**Response (200 OK)**:
```json
{
  "received": true,
  "type": "defesa_gerada",
  "chargebackId": "charge_xxxxx",
  "timestamp": "2025-02-19T10:30:00Z"
}
```

**O que faz**:
- ✓ Registra eventos em log
- ✓ Prepara para WebSocket notifications (futuramente)
- ✓ Integra com sistemas de notificação (email, Slack)

---

### 3. **POST /api/defesas/aprovar**

**Usado por**: Dashboard (usuário clica "Enviar Defesa")

**Request**:
```json
{
  "defesaId": "def_xxxxx",
  "chargebackId": "charge_xxxxx",
  "dossieMD": "# Dossiê...",
  "parecer": "Análise jurídica...",
  "submitToPagarme": true
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "defesaId": "def_xxxxx",
  "chargebackId": "charge_xxxxx",
  "status": "submitted",
  "message": "Defesa aprovada e submetida à Pagar.me",
  "pagarmeResponse": { /* resposta da API */ }
}
```

**O que faz**:
- ✓ Marca defesa como `submitted`
- ✓ Submete resposta para Pagar.me via API
- ✓ Registra timestamp de aprovação

---

## Configuração n8n

### 1. **Webhook Trigger**

```
Name: "Receber Chargeback Pagar.me"
Method: POST
Path: /webhook/chargebacks
Headers:
  - Authorization: Bearer ${PAGARME_WEBHOOK_SECRET}
```

### 2. **Nó: Validar HMAC**

```javascript
// Script Node em n8n
const crypto = require('crypto');
const signature = $('Webhook Trigger').headers['x-pagar-me-signature'];
const payload = $('Webhook Trigger').body;
const secret = process.env.PAGARME_WEBHOOK_SECRET;

const expectedSignature = crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(payload))
  .digest('hex');

return {
  valid: signature === expectedSignature,
  chargebackId: payload.data.id,
  orderId: payload.data.order_id
};
```

### 3. **Nó: HTTP Request → Pagar.me (Buscar dados)**

```
Method: GET
URL: https://api.pagar.me/core/v5/charges/${chargeId}
Authentication: Bearer Token
Headers:
  Authorization: Bearer ${PAGARME_API_KEY}
```

### 4. **Nó: HTTP Request → Shopify (Opcional)**

```
Method: GET
URL: ${NEXT_JS_URL}/api/shopify/get-order?orderName=${orderId}
Headers:
  Content-Type: application/json
```

### 5. **Nó: Claude (Triagem)**

```
Provider: OpenAI Compatible
Base URL: https://api.anthropic.com/v1
Model: claude-haiku-4-5-20251001
API Key: ${ANTHROPIC_API_KEY}

Prompt:
Você é um especialista em chargebacks.
Classifique o tipo: [produto_nao_recebido | fraude | desacordo_comercial | credito_nao_processado]
Retorne JSON: { "tipo": "...", "viabilidade": 0.0-1.0, "motivo": "..." }

Dados:
- Chargeback ID: ${chargebackId}
- Motivo: ${reason}
- Valor: ${amount}
```

### 6. **Nó: Claude (Redação)**

```
Provider: OpenAI Compatible
Base URL: https://api.anthropic.com/v1
Model: claude-sonnet-4-6
API Key: ${ANTHROPIC_API_KEY}

System Prompt: [Veja prompts/system-prompt-claude.md]

User Prompt:
Analise este chargeback e gere parecer jurídico:
- Tipo: ${triageResult.tipo}
- Viabilidade: ${triageResult.viabilidade}
- Motivo: ${reason}
- Rastreamento: ${tracking}
- Dados Shopify: ${shopifyData}

Retorne JSON estruturado conforme instruído.
```

### 7. **Nó: HTTP Request → POST /api/defesas/salvar**

```
Method: POST
URL: ${NEXT_JS_URL}/api/defesas/salvar
Headers:
  Content-Type: application/json

Body:
{
  "contestacaoId": "${chargebackId}",
  "chargebackId": "${chargebackId}",
  "dossie": "${htmlTemplate}",
  "dossieTitulo": "Dossiê de Defesa - ${chargebackId}",
  "dossieMD": "${claudeResponse.parecer}",
  "contestacao": {
    "gateway": "pagarme",
    "tipoContestacao": "${triageResult.tipo}",
    // ... demais campos
  },
  "parecer": ${claudeResponse},
  "shopifyData": ${shopifyData},
  "source": "n8n"
}
```

### 8. **Nó: HTTP Request → POST /api/defesas/webhook**

```
Method: POST
URL: ${NEXT_JS_URL}/api/defesas/webhook
Headers:
  Content-Type: application/json

Body:
{
  "type": "defesa_gerada",
  "chargebackId": "${chargebackId}",
  "defesaId": "${defesaSaveResult.defesaId}",
  "payload": {
    "tipo": "${triageResult.tipo}",
    "viabilidade": ${triageResult.viabilidade},
    "recomendacao": "${claudeResponse.recomendacao}"
  },
  "timestamp": "${new Date().toISOString()}"
}
```

### 9. **Nó: Email (Notificar Usuário)**

```
From: noreply@seudominio.com
To: ${customerEmail}
Subject: Sua defesa de chargeback foi gerada
Body: Defesa pronta para revisão! Acesse: ${dashboardUrl}
```

---

## Variáveis de Ambiente Necessárias

Adicione ao `.env.local`:

```bash
# n8n
N8N_WEBHOOK_SECRET=seu_webhook_secret_aqui
N8N_INSTANCE_URL=https://n8n.metodoltv.cloud

# Next.js (para n8n chamar de volta)
NEXT_JS_URL=https://seu-app.vercel.app

# APIs
PAGARME_API_KEY=sk_live_xxxxx
PAGARME_WEBHOOK_SECRET=whsec_xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
SHOPIFY_API_ACCESS_TOKEN=shpat_xxxxx

# SMTP (para emails)
SMTP_HOST=smtp.seudominio.com
SMTP_PORT=587
SMTP_USER=usuario@seudominio.com
SMTP_PASS=senha
SMTP_FROM=noreply@seudominio.com

# Slack (opcional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

---

## Fluxo Completo no Dashboard

### **Tela 1: Lista de Chargebacks**
```
┌─────────────────────────────────────────┐
│ Chargebacks Ativos                      │
├─────────────────────────────────────────┤
│ ID     │ Pedido │ Status   │ Ações      │
├────────┼────────┼──────────┼────────────┤
│ CB-001 │ 1001   │ ⏳ Rascunho │ Revisar → │
│ CB-002 │ 1002   │ ✓ Enviado  │ Ver       │
│ CB-003 │ 1003   │ ⏳ Erro     │ Retentar  │
└─────────────────────────────────────────┘
```

### **Tela 2: Revisar Defesa Gerada (por n8n)**
```
┌──────────────────────────────────────────────────┐
│ Defesa de Chargeback CB-001                      │
├──────────────────────────────────────────────────┤
│                                                  │
│ 📄 Dossiê Gerado pelo n8n                        │
│ ─────────────────────────────────────────────    │
│ Tipo: Produto não recebido                      │
│ Viabilidade: 85% ✓                               │
│ Recomendação: RESPONDER                          │
│                                                  │
│ Parecer Jurídico:                                │
│ "Art. 42-A e 49 do CDC. Rastreamento confirma.. │
│                                                  │
│ ────────────────────────────────────────────    │
│ [Rejeitar]  [Revisar]  [Enviar Defesa] →        │
│                                                  │
└──────────────────────────────────────────────────┘
```

### **Tela 3: Confirmar Envio**
```
┌─────────────────────────────────────────┐
│ Confirmar Envio da Defesa?              │
├─────────────────────────────────────────┤
│                                         │
│ ✓ Defesa pronta para envio             │
│ ✓ Parecer jurídico incluído            │
│ ✓ Documentação completa                 │
│                                         │
│ Enviando para Pagar.me...               │
│                                         │
│ [Cancelar]  [Enviar]                    │
│                                         │
└─────────────────────────────────────────┘
```

---

## Teste E2E

### **Passo 1: Simular Webhook Pagar.me**
```bash
curl -X POST http://localhost:3000/api/pagarme/chargebacks \
  -H "Content-Type: application/json" \
  -H "X-Pagar-Me-Signature: $(echo -n 'payload' | openssl dgst -sha256 -hmac 'secret')" \
  -d '{
    "type": "charge.chargebacked",
    "data": {
      "id": "chargeback_test_001",
      "charge_id": "charge_test_001",
      "order_id": "order_test_001",
      "amount": 15000,
      "reason": "produto_nao_recebido"
    }
  }'
```

### **Passo 2: Verificar Rascunho Criado**
- Abrir Dashboard
- Ver novo chargeback em "Chargebacks Ativos"
- Status: "⏳ Rascunho"

### **Passo 3: n8n Gera Defesa**
- Ativar workflow n8n
- Monitorar execução
- Verificar logs em `dashboard → console`

### **Passo 4: Revisar Defesa no Dashboard**
- Clique em "Revisar"
- Ler parecer jurídico + análise
- Clique "Enviar Defesa"

### **Passo 5: Verificar Submissão Pagar.me**
- Acessar Pagar.me dashboard
- Verificar que resposta foi enviada
- Status mudará para "✓ Enviado"

---

## Troubleshooting

| Problema | Causa | Solução |
|----------|-------|---------|
| Webhook não chega ao Next.js | URL incorreta em n8n | Verificar `NEXT_JS_URL` e firewall |
| Claude API retorna erro | Token expirado | Renovar `ANTHROPIC_API_KEY` |
| Defesa não salva | localStorage cheio | Limpar rascunhos antigos |
| Shopify retorna 404 | Pedido não existe | Validar `orderName` em Shopify |
| HMAC validation falha | Secret incorreto | Copiar exatamente do Pagar.me |

---

## Próximos Passos

1. ✅ Criar endpoints `/api/defesas/*`
2. ⏳ Integrar com localStorage para persistência
3. ⏳ Criar Dashboard UI para revisar/aprovar defesas
4. ⏳ Implementar WebSocket para notificações em tempo real
5. ⏳ Adicionar suporte a PDF rendering
6. ⏳ Integrar com Slack notifications

---

## Contato e Suporte

- n8n Cloud: https://n8n.metodoltv.cloud
- API Docs: POST /api/defesas/*
- Support: projeto@metodoltv.com
