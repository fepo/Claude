# Teste E2E Completo - Chargeback → Defesa → Pagar.me

## 🎯 Objetivo

Simular um **chargeback real** do início ao fim:
1. ✅ Webhook Pagar.me chega
2. ✅ Dashboard cria rascunho
3. ✅ n8n gera defesa (simulado)
4. ✅ Você revisa no Dashboard
5. ✅ Aprova e envia para Pagar.me
6. ✅ Validar que tudo funcionou

---

## ⏱️ Tempo Total: ~30 minutos

### Timeline
- **5 min**: Setup & Verificações
- **10 min**: Simular webhook
- **5 min**: Revisar no Dashboard
- **5 min**: Testar envio
- **5 min**: Validações finais

---

## 🔧 Pré-Requisitos

### 1. Verificar Dependências
```bash
# Instalar se ainda não fez
npm install react-markdown

# Verificar que tudo está instalado
npm ls react-markdown
```

### 2. Iniciar Servidor
```bash
npm run dev
# Deve estar rodando em http://localhost:3000
```

### 3. Abrir Console do Navegador
```
F12 → Console
```

---

## 📝 Passo 1: Setup Inicial

### 1.1 Limpar localStorage (opcional)
```javascript
// No console do navegador:
localStorage.removeItem('contestacao_rascunhos');
localStorage.removeItem('contestacao_form_autosave');
localStorage.clear(); // Se quiser limpar tudo
console.log('✓ localStorage limpo');
```

### 1.2 Verificar arquivo de armazenamento
```bash
# Terminal: Verificar storage.ts existe
cat src/lib/storage.ts | head -20
```

### 1.3 Listar APIs
```bash
# Verificar que as 3 APIs existem
ls -la src/app/api/defesas/
# Deve mostrar: salvar/, aprovar/, webhook/
```

---

## 🚀 Passo 2: Simular Webhook Pagar.me

### 2.1 Criar Payload de Teste

Crie um arquivo `test-payload.json`:

```json
{
  "type": "charge.chargebacked",
  "data": {
    "id": "chargeback_test_001",
    "charge_id": "charge_test_001",
    "order_id": "order_test_001",
    "amount": 15000,
    "reason": "produto_nao_recebido",
    "created_at": "2025-02-19T10:30:00Z",
    "customer": {
      "name": "João Silva",
      "email": "joao@example.com",
      "document": "123.456.789-00",
      "ip": "192.168.1.1"
    },
    "billing_address": {
      "line1": "Rua A",
      "line2": "Apto 123",
      "city": "São Paulo",
      "state": "SP",
      "zipCode": "01000-000",
      "country": "BR"
    },
    "shipping_address": {
      "line1": "Rua B",
      "line2": "Apt 456",
      "city": "São Paulo",
      "state": "SP",
      "zipCode": "01000-000",
      "country": "BR"
    },
    "items": [
      {
        "description": "Tênis Esportivo XYZ",
        "amount": 15000,
        "quantity": 1
      }
    ],
    "metadata": {
      "tracking_code": "BR123456789"
    }
  }
}
```

### 2.2 Enviar Webhook via cURL

Abra um terminal e execute:

```bash
# 1. Criar arquivo temporário com o payload
cat > /tmp/webhook-payload.json << 'EOF'
{
  "type": "charge.chargebacked",
  "data": {
    "id": "chargeback_test_001",
    "charge_id": "charge_test_001",
    "order_id": "order_test_001",
    "amount": 15000,
    "reason": "produto_nao_recebido",
    "created_at": "2025-02-19T10:30:00Z",
    "customer": {
      "name": "João Silva",
      "email": "joao@example.com",
      "document": "123.456.789-00",
      "ip": "192.168.1.1"
    }
  }
}
EOF

# 2. Enviar webhook (sem validação HMAC por enquanto)
curl -X POST http://localhost:3000/api/pagarme/chargebacks \
  -H "Content-Type: application/json" \
  -H "X-Pagar-Me-Signature: test_signature" \
  -d @/tmp/webhook-payload.json \
  -v
```

### 2.3 Validar Resposta

Você deve ver:
```json
{
  "received": true,
  "chargebackId": "chargeback_test_001",
  "rascunhoId": "...",
  "message": "Chargeback de R$ 150.00 no pedido #order_test_001 aguardando sua defesa"
}
```

✅ **Se receber isso, o webhook foi recebido com sucesso!**

---

## 📋 Passo 3: Verificar Rascunho Criado

### 3.1 No Browser Console
```javascript
// Verificar que rascunho foi salvo:
const rascunhos = JSON.parse(localStorage.getItem('contestacao_rascunhos') || '[]');
console.log('Rascunhos salvos:', rascunhos.length);
console.log('Primeiro rascunho:', rascunhos[0]);
```

Você deve ver algo como:
```
Rascunhos salvos: 1
Primeiro rascunho: {
  id: "draft_xxxxx",
  titulo: "Chargeback de R$ 150.00 no pedido #order_test_001",
  data: "2025-02-19T10:30:00Z",
  formulario: {
    contestacaoId: "chargeback_test_001",
    nomeCliente: "João Silva",
    ...
  }
}
```

✅ **Se isso apareceu, o rascunho foi criado!**

---

## 🤖 Passo 4: Simular Defesa do n8n

### 4.1 Enviar Defesa via API

```bash
curl -X POST http://localhost:3000/api/defesas/salvar \
  -H "Content-Type: application/json" \
  -d '{
    "contestacaoId": "chargeback_test_001",
    "chargebackId": "charge_test_001",
    "dossie": "<html><body>Dossiê HTML</body></html>",
    "dossieTitulo": "Dossiê de Defesa - Chargeback charge_test_001",
    "dossieMD": "# Dossiê de Defesa\n\n## 1. Informações da Disputa\n\n**Status**: Aberto\n**Motivo**: Produto não recebido\n**Valor**: R$ 150,00\n**Data**: 2025-02-19\n\n## 2. Base Legal\n\nArt. 42-A do CDC: Cobrança por débito em conta só é válida com autorização clara.\n\nArt. 49 do CDC: Consumidor tem 7 dias para se arrepender.\n\nResolução BCB nº 150: Arranjos devem oferecer mecanismos de contestação.\n\n## 3. Análise\n\n✓ Rastreamento confirma entrega\n✓ Cliente não apresentou prova\n✓ Produto foi enviado e entregue",
    "contestacao": {
      "gateway": "pagarme",
      "contestacaoId": "chargeback_test_001",
      "dataContestacao": "2025-02-19",
      "tipoContestacao": "produto_nao_recebido",
      "valorTransacao": "150.00",
      "bandeira": "Visa",
      "finalCartao": "1234",
      "dataTransacao": "2025-02-10",
      "numeroPedido": "order_test_001",
      "itensPedido": [{"descricao": "Tênis Esportivo XYZ", "valor": "150.00"}],
      "codigoConfirmacao": "CHARGE001",
      "nomeCliente": "João Silva",
      "cpfCliente": "123.456.789-00",
      "emailCliente": "joao@example.com",
      "enderecoEntrega": "Rua B, Apto 456, São Paulo - SP, 01000-000",
      "enderecoFaturamento": "Rua A, Apto 123, São Paulo - SP, 01000-000",
      "ipComprador": "192.168.1.1",
      "transportadora": "Correios",
      "codigoRastreio": "BR123456789",
      "eventosRastreio": [
        {"data": "2025-02-11", "descricao": "Objeto saiu para entrega"},
        {"data": "2025-02-12", "descricao": "Objeto entregue ao destinatário"}
      ],
      "comunicacoes": [
        {"data": "2025-02-10", "tipo": "email", "descricao": "Confirmação de pedido enviada"}
      ],
      "nomeEmpresa": "Sua Loja",
      "cnpjEmpresa": "00.000.000/0000-00",
      "emailEmpresa": "contato@loja.com",
      "telefoneEmpresa": "(11) 3000-0000",
      "enderecoEmpresa": "Rua X, 789, São Paulo - SP",
      "politicaReembolsoUrl": "https://loja.com/politica-reembolso"
    },
    "parecer": {
      "tipo": "produto_nao_recebido",
      "viabilidade": 0.85,
      "parecer": "Art. 42-A e 49 do CDC. Rastreamento confirma entrega ao destinatário em 2025-02-12. Cliente não apresentou prova de não recebimento. Recomenda-se responder ao chargeback com evidências de entrega.",
      "argumentos": [
        "Rastreamento confirma entrega ao destinatário",
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
  }' \
  -v
```

### 4.2 Validar Resposta

Você deve receber:
```json
{
  "success": true,
  "defesaId": "def_xxxxx",
  "contestacaoId": "chargeback_test_001",
  "chargebackId": "charge_test_001",
  "status": "drafted",
  "message": "Defesa salva como rascunho. Aguardando aprovação do usuário.",
  "dashboardUrl": "/defesa/def_xxxxx"
}
```

✅ **Defesa salva com sucesso!**

---

## 📊 Passo 5: Acessar Dashboard

### 5.1 Abrir Lista de Defesas
Abra no navegador:
```
http://localhost:3000/defesas
```

Você deve ver:
```
📋 Minhas Defesas

Filtros: [Todas: 1] [🤖 Automáticas: 1] [✋ Manuais: 0]

┌─────────────────────────────────────┐
│ Dossiê de Defesa - Chargeback...    │
│ Chargeback: charge_test_001         │
│ Status: 🟡 Rascunho   🤖 Auto       │
│ Tipo: Produto não recebido          │
│ Viabilidade: [====●   ] 85%         │
│ Confiança: 92%                      │
│ ✓ RESPONDER (recomendado)           │
│ Cliente: João Silva                 │
│ Ver detalhes →                      │
└─────────────────────────────────────┘
```

✅ **Se viu isso, defesa está listada!**

### 5.2 Clicar em "Ver Detalhes"

Você deve ser redirecionado para:
```
http://localhost:3000/defesas/def_xxxxx
```

E ver:
- ✅ Parecer jurídico com viabilidade 85%
- ✅ Recomendação: "✓ RESPONDER"
- ✅ Argumentos listados
- ✅ Dossiê markdown (botões: Copy, MD, PDF)
- ✅ Dados Shopify
- ✅ Dados do cliente
- ✅ Botão "✓ Enviar para Pagar.me"

---

## ✅ Passo 6: Testar Envio para Pagar.me

### 6.1 Clicar no Botão "Enviar para Pagar.me"

No navegador, na página `/defesas/[id]`:
1. Role até o final
2. Clique em **"✓ Enviar para Pagar.me"**
3. Modal de confirmação deve aparecer:

```
┌────────────────────────────────┐
│ Confirmar Envio da Defesa       │
│                                │
│ ⚠️ Verifique antes de enviar:  │
│ ✓ Dossiê completo e correto   │
│ ✓ Incluiu todas as evidências │
│ ✓ Base legal (CDC Art. 49)    │
│ ✓ Parecer jurídico analisado  │
│                                │
│ [Cancelar] [Confirmar Envio]  │
└────────────────────────────────┘
```

### 6.2 Confirmar Envio

Clique em **"Confirmar Envio"**

O botão vai ficar em loading:
```
[⏳ Enviando...]
```

### 6.3 Validar POST

No **Console (F12)**:
```javascript
// Você deve ver a requisição para /api/defesas/aprovar
// Abra a aba "Network" (F12 → Network)
// e procure por:
// POST /api/defesas/aprovar
```

---

## 🔍 Passo 7: Validações Finais

### 7.1 Verificar localStorage

```javascript
// No console:
const rascunhos = JSON.parse(localStorage.getItem('contestacao_rascunhos') || '[]');
const defesa = rascunhos.find(r => r.formulario._defesaMeta?.chargebackId === 'charge_test_001');
console.log('Status da defesa:', defesa?.formulario._defesaMeta?.status);
// Deve mostrar: "submitted" (e não mais "drafted")
```

✅ **Se mostra "submitted", defesa foi enviada!**

### 7.2 Verificar Resposta da API

Na aba **Network (F12)**, clique na requisição `/api/defesas/aprovar`:
- **Status**: 200 (verde)
- **Response**:
```json
{
  "success": true,
  "defesaId": "def_xxxxx",
  "chargebackId": "charge_test_001",
  "status": "submitted",
  "message": "Defesa aprovada e submetida à Pagar.me"
}
```

✅ **Se recebeu isso, sucesso!**

### 7.3 Voltar para a Lista

```
http://localhost:3000/defesas
```

O card agora deve mostrar:
```
Status: 🔵 Enviado (antes era 🟡 Rascunho)
```

✅ **Status foi atualizado!**

---

## 📊 Checklist de Validação

### Webhook
- [ ] POST http://localhost:3000/api/pagarme/chargebacks retorna 200
- [ ] Resposta contém chargebackId e rascunhoId
- [ ] localStorage mostra rascunho criado

### Dashboard - Lista
- [ ] http://localhost:3000/defesas carrega
- [ ] Defesa aparece na lista
- [ ] Badges: Status, Fonte, Viabilidade
- [ ] Filtros funcionam (Todas, Auto, Manual)

### Dashboard - Detalhe
- [ ] http://localhost:3000/defesas/[id] carrega
- [ ] Parecer jurídico completo aparece
- [ ] Recomendação é "✓ RESPONDER"
- [ ] Dossiê markdown aparece
- [ ] Botões (Copy, MD, PDF) funcionam
- [ ] Dados Shopify aparecem
- [ ] Dados do cliente aparecem
- [ ] Botão "✓ Enviar para Pagar.me" está ativo

### Envio para Pagar.me
- [ ] Modal de confirmação aparece
- [ ] Clique "Confirmar Envio"
- [ ] POST /api/defesas/aprovar retorna 200
- [ ] Status muda para "🔵 Enviado"
- [ ] localStorage mostra status: "submitted"

### Final
- [ ] Voltar para /defesas
- [ ] Card mostra novo status "Enviado"
- [ ] Console não tem erros vermelhos

---

## 🐛 Troubleshooting

### Problema: Webhook retorna erro
```json
{"error": "Invalid signature"}
```
**Solução**: Remova a linha `PAGARME_WEBHOOK_SECRET` do `.env.local` temporariamente (ou use "test_signature")

### Problema: "Defesa não encontrada" em /defesas/[id]
**Solução**:
1. Volte para /defesas
2. Copie o ID correto do card
3. Acesse /defesas/{ID_correto}

### Problema: Botão "Enviar" está desabilitado
**Solução**: Status não é "drafted". Verifique:
```javascript
const rascunhos = JSON.parse(localStorage.getItem('contestacao_rascunhos'));
const status = rascunhos[0].formulario._defesaMeta.status;
console.log('Status atual:', status); // Deve ser "drafted"
```

### Problema: Modal não aparece
**Solução**:
1. Abra console (F12)
2. Procure por erros vermelhos
3. Verifique que `ApprovalModal.tsx` foi criado corretamente

### Problema: "react-markdown não encontrado"
**Solução**:
```bash
npm install react-markdown
npm run dev
```

---

## 🎯 Resumo do Teste E2E

| Etapa | Ação | Validação |
|-------|------|-----------|
| 1 | Webhook Pagar.me | ✅ Rascunho criado |
| 2 | n8n salva defesa | ✅ Defesa em localStorage |
| 3 | Abrir /defesas | ✅ Defesa listada |
| 4 | Clicar detalhe | ✅ Parecer + dossiê visível |
| 5 | Enviar para Pagar.me | ✅ Modal confirmação |
| 6 | Confirmar envio | ✅ Status = "submitted" |
| 7 | Validações | ✅ Tudo funcionando |

---

## ✨ Resultado Esperado

Após completar todos os passos, você deve ter:

✅ **Fluxo completo funcionando:**
```
Webhook → Rascunho → Dashboard → Revisar → Aprovar → Enviado
```

✅ **Sem erros** no console (F12)

✅ **localStorage** com defesa e status "submitted"

✅ **UI respondendo** a cliques e transições

---

## 📞 Próximas Etapas

Se tudo passou no teste E2E:

1. ✅ **Integrar com n8n real** (veja `N8N_INTEGRATION.md`)
2. ✅ **Conectar PostgreSQL** (trocar localStorage)
3. ✅ **Deploy em produção** (Vercel/seu servidor)
4. ✅ **Configurar notificações** (Email + Slack)

---

## 🚀 Bom Teste!

Qualquer dúvida, verifique os logs:
- **Browser Console**: F12
- **Network**: F12 → Network → procure por /api/*
- **localStorage**: `localStorage.getItem('contestacao_rascunhos')`
