# Dashboard de Defesas - Quick Start (5 min)

## ✅ O Que Foi Criado

```
✅ Página /defesas - Lista de defesas
✅ Página /defesas/[id] - Revisar defesa
✅ 2 Componentes React (DossieViewer, ApprovalModal)
✅ 3 APIs endpoints (/api/defesas/*)
✅ Documentação completa (3 arquivos)
```

## 📦 Instalação em 3 Passos

### Passo 1: Instalar Dependência
```bash
npm install react-markdown
```

### Passo 2: Adicionar Link no Menu (Layout)

Abra `src/app/layout.tsx` e adicione este link no menu:

```tsx
import Link from "next/link";

// Dentro da navegação:
<Link
  href="/defesas"
  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100"
>
  📋 Minhas Defesas
</Link>
```

### Passo 3: Adicionar Botão na Página Principal (Home)

Abra `src/app/page.tsx` e adicione este botão:

```tsx
// No início da página, após o Dashboard:
{showDashboard && (
  <div className="flex gap-3">
    <button
      onClick={() => router.push("/defesas")}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 font-medium transition-colors"
    >
      📋 Ver Minhas Defesas
    </button>
  </div>
)}
```

## 🚀 Usar Agora

### Local (desenvolvimento)
```bash
npm run dev
# Abrir http://localhost:3000/defesas
```

### Teste sem n8n (mock)

1. **Salvar uma defesa mock** via curl:
```bash
curl -X POST http://localhost:3000/api/defesas/salvar \
  -H "Content-Type: application/json" \
  -d '{
    "contestacaoId": "test_001",
    "chargebackId": "charge_test_001",
    "dossie": "<html>...</html>",
    "dossieTitulo": "Dossiê de Teste",
    "dossieMD": "# Defesa de Teste\n\nConteúdo aqui",
    "contestacao": {
      "gateway": "pagarme",
      "nomeCliente": "João Silva",
      "emailCliente": "joao@example.com",
      "valorTransacao": "150.00",
      "numeroPedido": "#1001",
      "tipoContestacao": "produto_nao_recebido",
      "itensPedido": [{"descricao": "Produto", "valor": "150.00"}],
      "dataContestacao": "2025-02-19",
      "dataTransacao": "2025-02-10",
      "contestacaoId": "test_001",
      "bandeira": "Visa",
      "finalCartao": "1234",
      "codigoConfirmacao": "ABC123",
      "cpfCliente": "123.456.789-00",
      "enderecoEntrega": "Rua X, 123",
      "enderecoFaturamento": "Rua X, 123",
      "ipComprador": "192.168.1.1",
      "transportadora": "Correios",
      "codigoRastreio": "BR123456789",
      "eventosRastreio": [{"data": "2025-02-12", "descricao": "Entregue"}],
      "comunicacoes": [],
      "nomeEmpresa": "Sua Empresa",
      "cnpjEmpresa": "00.000.000/0000-00",
      "emailEmpresa": "contato@empresa.com",
      "telefoneEmpresa": "(11) 3000-0000",
      "enderecoEmpresa": "Rua Y, 456",
      "politicaReembolsoUrl": "https://..."
    },
    "parecer": {
      "tipo": "produto_nao_recebido",
      "viabilidade": 0.85,
      "parecer": "Análise jurídica: Art. 42-A e 49 do CDC. Rastreamento confirma entrega...",
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
  }'
```

2. **Abrir o Dashboard**:
   - http://localhost:3000/defesas
   - Vê a defesa listada
   - Clica para revisar
   - Clica "Enviar para Pagar.me"

## 📁 Estrutura de Pastas

```
src/app/
├── defesas/
│   ├── page.tsx                    # ✨ NOVO: Lista defesas
│   └── [id]/
│       └── page.tsx                # ✨ NOVO: Detalhe defesa
├── components/
│   ├── DossieViewer.tsx            # ✨ NOVO: Visualizador
│   ├── ApprovalModal.tsx           # ✨ NOVO: Modal confirmação
│   └── ... (existentes)
└── api/
    └── defesas/                    # ✨ NOVO
        ├── salvar/
        │   └── route.ts
        ├── aprovar/
        │   └── route.ts
        └── webhook/
            └── route.ts
```

## 🔗 URLs Importantes

| URL | Propósito |
|-----|-----------|
| `http://localhost:3000/defesas` | Listar defesas |
| `http://localhost:3000/defesas/[id]` | Revisar defesa |
| `POST /api/defesas/salvar` | n8n envia defesa |
| `POST /api/defesas/aprovar` | Aprovar e enviar |
| `POST /api/defesas/webhook` | Notificações n8n |

## ✨ Features Principais

### Página `/defesas` (Lista)
```
📋 Minhas Defesas

Filtros:
• Todas (12)
• 🤖 Automáticas (8)
• ✋ Manuais (4)

Cards com:
✓ Título + ID chargeback
✓ Status badge (Rascunho, Enviado, etc)
✓ Fonte badge (🤖 Auto, ✋ Manual)
✓ Tipo de disputa
✓ Viabilidade % (barra)
✓ Confiança IA
✓ Cliente + Data geração
✓ Link "Ver detalhes →"
```

### Página `/defesas/[id]` (Detalhe)
```
Dossiê - Chargeback CB-001

Seções:
1. 📊 Parecer Jurídico
   • Tipo + Viabilidade + Confiança
   • Recomendação (RESPONDER / NÃO / ACOMPANHAR)
   • Argumentos principais
   • Parecer completo

2. 📄 Dossiê Markdown
   • Toggle: Formatado / Raw
   • Botões: Copiar / Download MD / Print PDF
   • Scroll for more content

3. 🛒 Shopify Data (se existe)
   • Order ID, Fulfillment, Financial Status
   • Tracking info

4. 👤 Cliente
   • Nome, Email, CPF, Endereço, IP

5. [Voltar]  [Enviar para Pagar.me] ✓
```

## 🎯 Workflow Completo

```
1️⃣ Chargeback chega via Pagar.me webhook
   ↓
2️⃣ n8n workflow:
   • Claude Triagem (classifica tipo)
   • Claude Redação (parecer jurídico)
   • POST /api/defesas/salvar
   ↓
3️⃣ Defesa salva em localStorage
   ↓
4️⃣ Você acessa /defesas
   ↓
5️⃣ Clica para revisar /defesas/[id]
   ↓
6️⃣ Lê parecer + dossiê + dados
   ↓
7️⃣ Clica "Enviar para Pagar.me"
   ↓
8️⃣ Confirma no modal
   ↓
9️⃣ POST /api/defesas/aprovar
   ↓
🔟 Defesa enviada ✓
```

## 🧪 Checklist Antes de Usar

- [ ] npm install react-markdown ✓
- [ ] Link adicionado em layout.tsx
- [ ] Botão adicionado em page.tsx
- [ ] npm run dev iniciado
- [ ] Acessar http://localhost:3000/defesas
- [ ] Testar com mock curl (veja acima)
- [ ] Testar revisar defesa
- [ ] Testar enviar para Pagar.me

## ⚠️ Importante

### localStorage vs PostgreSQL
- Atualmente: **localStorage** (funciona local)
- Futuro: **PostgreSQL** (para produção)

### Dependência Adicional
```bash
npm install react-markdown
```

### Próximas Features
- [ ] Editar defesa antes de enviar
- [ ] PostgreSQL para persistência
- [ ] Notificações em tempo real (Slack)
- [ ] Histórico de versões
- [ ] Analytics de sucesso

## 🚀 Deploy em Produção

### Vercel
```bash
git add .
git commit -m "feat: dashboard defesas UI"
git push origin main
# Auto-deploy em prod
```

### Seu servidor
```bash
npm run build
npm start
# Acessa em https://seu-dominio.com/defesas
```

## 📞 Próximas Dúvidas?

Consulte:
- **Como usar**: `DASHBOARD_DEFESAS.md`
- **Integração n8n**: `N8N_INTEGRATION.md`
- **Técnico/Arquitetura**: `DASHBOARD_UI_SUMMARY.md`

---

## 🎉 Pronto!

Dashboard de Defesas está:
- ✅ Criado
- ✅ Documentado
- ✅ Pronto para usar

Próximo passo: **Conectar com n8n** (veja `N8N_INTEGRATION.md`)
