# 🧪 Teste E2E - Checklist Visual

## 📋 Guia Rápido

Imprima ou abra este arquivo lado-a-lado com o navegador para acompanhar o progresso do teste.

---

## ✅ PRÉ-REQUISITOS (5 min)

- [ ] **Dependências instaladas**
  ```bash
  npm install react-markdown
  ```

- [ ] **Servidor rodando**
  ```bash
  npm run dev
  # Deve mostrar: "ready - started server on 0.0.0.0:3000"
  ```

- [ ] **Console do navegador aberto**
  ```
  F12 → Console (abra em nova aba ou lado)
  ```

- [ ] **localStorage limpo** (opcional)
  ```javascript
  localStorage.clear();
  console.log('✓ localStorage limpo');
  ```

---

## 🔄 PASSO 1: WEBHOOK (5 min)

### 1.1 - Enviar Webhook via Terminal

```bash
# Terminal: Copie e execute este comando
curl -X POST http://localhost:3000/api/pagarme/chargebacks \
  -H "Content-Type: application/json" \
  -H "X-Pagar-Me-Signature: test_signature" \
  -d '{
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
  }'
```

### 1.2 - Validar Resposta

Terminal deve mostrar:
```json
{
  "received": true,
  "chargebackId": "chargeback_test_001",
  "message": "Chargeback de R$ 150.00..."
}
```

- [ ] **Status: 200** (verde em Network)
- [ ] **Response contém "received":true**
- [ ] **chargebackId presente**

---

## 💾 PASSO 2: VERIFICAR RASCUNHO (3 min)

### 2.1 - Abrir Console (F12)

### 2.2 - Executar Validação

```javascript
// Cole no console:
const rascunhos = JSON.parse(localStorage.getItem('contestacao_rascunhos') || '[]');
console.log('Total de rascunhos:', rascunhos.length);
console.log('Primeiro rascunho:', rascunhos[0]?.titulo);
console.log('Cliente:', rascunhos[0]?.formulario?.nomeCliente);
```

Você deve ver:
```
Total de rascunhos: 1
Primeiro rascunho: Chargeback de R$ 150.00 no pedido #order_test_001
Cliente: João Silva
```

- [ ] **localStorage tem 1 rascunho**
- [ ] **Cliente é "João Silva"**
- [ ] **Título contém "order_test_001"**

---

## 🚀 PASSO 3: SALVAR DEFESA (5 min)

### 3.1 - Enviar Defesa via Terminal

```bash
curl -X POST http://localhost:3000/api/defesas/salvar \
  -H "Content-Type: application/json" \
  -d '{
    "contestacaoId": "chargeback_test_001",
    "chargebackId": "charge_test_001",
    "dossie": "<html>...</html>",
    "dossieTitulo": "Dossiê de Defesa - Chargeback charge_test_001",
    "dossieMD": "# Dossiê\n\n## Base Legal\n\nArt. 49 CDC...",
    "contestacao": {
      "gateway": "pagarme",
      "contestacaoId": "chargeback_test_001",
      "nomeCliente": "João Silva",
      "emailCliente": "joao@example.com",
      "tipoContestacao": "produto_nao_recebido",
      "valorTransacao": "150.00",
      "numeroPedido": "order_test_001",
      "dataContestacao": "2025-02-19",
      "dataTransacao": "2025-02-10",
      "itensPedido": [{"descricao": "Tênis", "valor": "150.00"}],
      "codigoConfirmacao": "ABC123",
      "bandeira": "Visa",
      "finalCartao": "1234",
      "cpfCliente": "123.456.789-00",
      "enderecoEntrega": "Rua B",
      "enderecoFaturamento": "Rua A",
      "ipComprador": "192.168.1.1",
      "transportadora": "Correios",
      "codigoRastreio": "BR123456789",
      "eventosRastreio": [{"data": "2025-02-12", "descricao": "Entregue"}],
      "comunicacoes": [],
      "nomeEmpresa": "Sua Loja",
      "cnpjEmpresa": "00.000.000/0000-00",
      "emailEmpresa": "contato@loja.com",
      "telefoneEmpresa": "(11) 3000-0000",
      "enderecoEmpresa": "Rua X",
      "politicaReembolsoUrl": "https://..."
    },
    "parecer": {
      "tipo": "produto_nao_recebido",
      "viabilidade": 0.85,
      "parecer": "Art. 49 CDC. Rastreamento confirma entrega...",
      "argumentos": ["Rastreamento", "Data anterior", "Sem prova"],
      "recomendacao": "responder",
      "confianca": 0.92
    },
    "source": "n8n"
  }'
```

### 3.2 - Validar Resposta

Terminal deve mostrar:
```json
{
  "success": true,
  "defesaId": "def_xxxxx",
  "status": "drafted"
}
```

- [ ] **Status: 200**
- [ ] **"success": true**
- [ ] **defesaId presente** (copie este ID!)

**⚠️ Copie o defesaId, você vai usar em breve!**

---

## 📊 PASSO 4: ACESSAR DASHBOARD (5 min)

### 4.1 - Abrir Lista de Defesas

Navegador: Abra
```
http://localhost:3000/defesas
```

Você deve ver:
```
📋 Minhas Defesas
Revise e aprove as defesas geradas

Filtros:
[Todas: 1]  [🤖 Automáticas: 1]  [✋ Manuais: 0]

┌─────────────────────────────────────┐
│ Dossiê de Defesa - Chargeback...    │
│ Chargeback: charge_test_001         │
│ Status: 🟡 Rascunho   🤖 Auto       │
│ Tipo: Produto não recebido          │
│ Viabilidade: ████░░░░░░ 85%         │
│ 92% confiança                       │
│ ✓ RESPONDER                         │
│ Cliente: João Silva   Gerado em ... │
│ Ver detalhes →                      │
└─────────────────────────────────────┘
```

- [ ] **Página carregou**
- [ ] **Um card de defesa aparece**
- [ ] **Status é 🟡 Rascunho**
- [ ] **Viabilidade é 85%**
- [ ] **Botão "Ver detalhes →" visível**

### 4.2 - Clicar em "Ver Detalhes"

Clique no card ou no botão "Ver detalhes →"

Você deve ser redirecionado para:
```
http://localhost:3000/defesas/def_xxxxx
```

E ver:
```
📋 Dossiê de Defesa - Chargeback...
Chargeback: charge_test_001

Badges:
🟡 Rascunho   🤖 Automática   Gerado há X min
```

- [ ] **Página carregou**
- [ ] **URL é /defesas/[ID]**
- [ ] **Título do dossiê aparece**

---

## 📄 PASSO 5: REVISAR CONTEÚDO (5 min)

### 5.1 - Parecer Jurídico

Role até ver:
```
📊 PARECER JURÍDICO

Tipo: Produto não recebido
Viabilidade: ████░░░░░░ 85%  |  Confiança: ██████░░░░ 92%

✓ RECOMENDADO RESPONDER

Argumentos Principais:
✓ Rastreamento confirma entrega
✓ Data de entrega anterior ao chargeback
✓ Cliente não apresentou prova
```

- [ ] **Parecer aparece**
- [ ] **Viabilidade visual (barra) mostra 85%**
- [ ] **Recomendação é "✓ RESPONDER"**
- [ ] **Argumentos listados**

### 5.2 - Dossiê Markdown

Role até ver:
```
📄 DOSSIÊ DE DEFESA

[👁️ Formatado] [</> Raw]
[Copiar]  [MD]  [PDF]

# Dossiê de Defesa
## 1. Informações da Disputa
Status: Aberto
Motivo: Produto não recebido
...
```

- [ ] **Dossiê aparece em view formatado**
- [ ] **Botões (Copy, MD, PDF) visíveis**
- [ ] **Conteúdo markdown visível**

**Teste os botões:**
- [ ] **[Copiar]** → "Copiado!" feedback
- [ ] **[MD]** → Download arquivo .md
- [ ] **[PDF]** → Abre janela print do navegador

### 5.3 - Dados do Cliente

Role até ver:
```
👤 DADOS DO CLIENTE

Nome: João Silva
Email: joao@example.com
CPF: 123.456.789-00
Endereço: Rua B, Apto 456...
```

- [ ] **Nome é "João Silva"**
- [ ] **Email correto**
- [ ] **CPF visível**

---

## ✅ PASSO 6: ENVIAR PARA PAGAR.ME (10 min)

### 6.1 - Rolar até o Final

No fim da página você deve ver:
```
[← Voltar]  [👁️ Revisar]  [✓ Enviar para Pagar.me]
```

- [ ] **Botão "✓ Enviar para Pagar.me" visível**
- [ ] **Botão está habilitado** (não cinzento)

### 6.2 - Clicar no Botão

Clique em **"✓ Enviar para Pagar.me"**

Modal deve aparecer:
```
┌────────────────────────────────────┐
│ ⚠️ Confirmar Envio da Defesa        │
│                                    │
│ Você está prestes a enviar...      │
│                                    │
│ ⚠️ Verifique antes de enviar:      │
│ ✓ Dossiê completo e correto       │
│ ✓ Incluiu todas as evidências     │
│ ✓ Base legal (CDC Art. 49)        │
│ ✓ Parecer jurídico analisado      │
│                                    │
│ Defesa: def_xxxxx                 │
│ Chargeback: charge_test_001       │
│                                    │
│ [Cancelar]  [Confirmar Envio]     │
└────────────────────────────────────┘
```

- [ ] **Modal apareceu**
- [ ] **Checklist visível**
- [ ] **IDs presentes no modal**

### 6.3 - Confirmar Envio

Clique em **"Confirmar Envio"**

Você deve ver:
```
[⏳ Enviando...]
```

Depois de alguns segundos:
```
Alert: ✓ Defesa enviada com sucesso!

Referência: charge_test_001
```

- [ ] **Modal mostrou loading**
- [ ] **Alert de sucesso apareceu**
- [ ] **Referência exibida**

---

## 🔍 PASSO 7: VALIDAÇÕES FINAIS (5 min)

### 7.1 - Verificar Status no localStorage

Console (F12):
```javascript
const r = JSON.parse(localStorage.getItem('contestacao_rascunhos') || '[]');
const defesa = r.find(d => d.formulario._defesaMeta?.chargebackId === 'charge_test_001');
console.log('Status:', defesa?.formulario._defesaMeta?.status);
// Deve mostrar: "submitted"
```

- [ ] **Status é "submitted"** (não mais "drafted")

### 7.2 - Verificar Network (F12)

Abra: **F12 → Network tab**

Procure pela requisição:
```
POST /api/defesas/aprovar
Status: 200 ✓
```

- [ ] **Requisição POST aparece**
- [ ] **Status é 200 (verde)**
- [ ] **Response tem "success": true**

### 7.3 - Voltar para Lista

Clique no link "← Voltar" ou acesse:
```
http://localhost:3000/defesas
```

Você deve ver o card com:
```
Status: 🔵 Enviado (antes era 🟡 Rascunho)
```

- [ ] **Página carregou**
- [ ] **Card mostra novo status**
- [ ] **Status é 🔵 Enviado**

---

## 🎉 TESTE CONCLUÍDO!

Se você marcou ✅ em TODOS os checkboxes acima, parabéns! 🎊

```
✅ Webhook Pagar.me → Recebido
✅ Rascunho criado → localStorage
✅ Defesa salva → API /api/defesas/salvar
✅ Dashboard listando → /defesas
✅ Detalhe carregando → /defesas/[id]
✅ Conteúdo visível → Parecer + Dossiê
✅ Envio funcionando → Modal + API /api/defesas/aprovar
✅ Status atualizado → "submitted"
```

---

## 📊 Resumo do Teste

| Etapa | Ação | Resultado |
|-------|------|-----------|
| 1 | Webhook Pagar.me | ✅ Rascunho criado |
| 2 | Verificar localStorage | ✅ Dados salvos |
| 3 | Salvar Defesa (n8n) | ✅ Defesa criada |
| 4 | Dashboard - Lista | ✅ Defesa listada |
| 5 | Dashboard - Detalhe | ✅ Parecer + Dossiê |
| 6 | Enviar para Pagar.me | ✅ Status = submitted |
| 7 | Validações | ✅ Tudo funcionando |

---

## 🐛 Se Algo Falhou...

Verifique:

### Webhook retorna erro?
```
❌ Webhook não recebido → Verifique:
   □ Servidor está rodando? (npm run dev)
   □ URL está correta? (localhost:3000)
   □ JSON está válido? (use https://jsonlint.com)
```

### Defesa não aparece no Dashboard?
```
❌ /defesas não mostra defesa → Verifique:
   □ Você salvou a defesa via POST /api/defesas/salvar?
   □ localStorage tem dados? (console: localStorage.getItem('contestacao_rascunhos'))
   □ Atualize a página (F5)
```

### Botão "Enviar" não funciona?
```
❌ Botão desabilitado ou não funciona → Verifique:
   □ Status é "drafted"? (localStorage check)
   □ Abra console F12, procure por erros vermelhos
   □ Network tab (F12 → Network) → POST /api/defesas/aprovar
```

---

## 📞 Suporte

Dúvidas? Verifique:
- **TESTE_E2E.md** - Guia detalhado com payloads
- **DASHBOARD_DEFESAS.md** - Guia de uso do Dashboard
- **Browser Console (F12)** - Procure por erros vermelhos
- **Network Tab (F12)** - Verifique requisições HTTP

---

## ✨ Próximos Passos

Após o teste E2E bem-sucedido:

1. **Integrar com n8n Real** → `N8N_INTEGRATION.md`
2. **Trocar localStorage por PostgreSQL** → Para produção
3. **Deploy em Vercel** → Ir online
4. **Configurar Notificações** → Email + Slack

---

**Boa sorte com o teste! 🚀**
