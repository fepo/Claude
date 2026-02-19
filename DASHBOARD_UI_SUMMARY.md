# Dashboard UI - Resumo da Implementação

## 📦 Arquivos Criados

### Páginas (2)
```
src/app/defesas/
├── page.tsx                    # Lista de defesas em rascunho
└── [id]/
    └── page.tsx               # Revisar defesa específica
```

### Componentes (2)
```
src/app/components/
├── DossieViewer.tsx           # Visualizador de dossiê markdown
└── ApprovalModal.tsx          # Modal de confirmação de envio
```

### APIs (3)
```
src/app/api/defesas/
├── salvar/route.ts            # POST - Salvar defesa (n8n → Dashboard)
├── aprovar/route.ts           # POST - Aprovar e enviar para Pagar.me
└── webhook/route.ts           # POST - Notificações do n8n
```

### Documentação (2)
```
├── DASHBOARD_DEFESAS.md       # Guia de uso completo
└── N8N_INTEGRATION.md         # Integração n8n ↔ Dashboard
```

---

## 🎯 Funcionalidades

### Página `/defesas` (Lista)
- ✅ Listar todas as defesas com filtros
- ✅ Badges de status (Rascunho, Enviado, Ganho, Perdido)
- ✅ Badges de fonte (🤖 Auto, ✋ Manual)
- ✅ Viabilidade visual (barra %)
- ✅ Confiança da IA
- ✅ Clique para revisar

### Página `/defesas/[id]` (Detalhe)
- ✅ Parecer jurídico completo
- ✅ Recomendação (RESPONDER / NÃO RESPONDER / ACOMPANHAR)
- ✅ Argumentos principais
- ✅ Dossiê markdown (view formatado ou raw)
- ✅ Dados Shopify enriquecidos
- ✅ Dados do cliente
- ✅ Botão aprovar com modal de confirmação

### Componente `DossieViewer`
- ✅ Toggle: Formatado / Raw
- ✅ Copiar para clipboard
- ✅ Download como .md
- ✅ Print to PDF
- ✅ Stats: linhas, palavras, caracteres

### Componente `ApprovalModal`
- ✅ Checklist de verificação
- ✅ Aviso sobre viabilidade baixa
- ✅ IDs para referência
- ✅ Botões: Cancelar / Confirmar

### APIs
- ✅ `/api/defesas/salvar` - Salva defesa (n8n envia)
- ✅ `/api/defesas/aprovar` - Aprova e submete para Pagar.me
- ✅ `/api/defesas/webhook` - Recebe notificações do n8n

---

## 🔄 Fluxo Integrado

```
┌─────────────────────────────────────────────────────────────┐
│                  WEBHOOK PAGAR.ME                           │
│                   (chargeback criado)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
   ┌─────────────┐           ┌──────────────┐
   │   Next.js   │           │   n8n Cloud  │
   │   API       │           │   Workflow   │
   │             │           │              │
   │ /api/pagarme│           ├─ Triagem     │
   │ /chargebacks│           ├─ Redação     │
   └──────┬──────┘           └────┬─────────┘
          │                        │
          │ Salva rascunho        │ Gera defesa
          │ localStorage           │ automática
          │                        │
          └───────────────┬────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  POST /api/defesas/   │
              │       salvar          │
              │                       │
              │ • contestacao         │
              │ • parecer             │
              │ • shopifyData         │
              │ • source: "n8n"       │
              └─────────┬─────────────┘
                        │
                        ▼
            ┌────────────────────────┐
            │  /defesas (list page)  │
            │                        │
            │ Filtros:               │
            │ • Todas                │
            │ • 🤖 Automáticas       │
            │ • ✋ Manuais           │
            └────────┬───────────────┘
                     │ Click
                     ▼
         ┌──────────────────────────┐
         │ /defesas/[id] (detail)   │
         │                          │
         │ 📊 Parecer jurídico      │
         │ 📄 Dossiê markdown       │
         │ 🛒 Shopify data          │
         │ 👤 Cliente data          │
         │                          │
         │ [✓ Enviar para Pagar.me] │
         └────────┬─────────────────┘
                  │ Click
                  ▼
        ┌──────────────────────────┐
        │  ApprovalModal           │
        │  (confirmação)           │
        │                          │
        │  Checklist:              │
        │  ✓ Dossiê correto        │
        │  ✓ Evidências incluídas  │
        │  ✓ Base legal OK         │
        │  ✓ Parecer revisado      │
        │                          │
        │  [Cancelar] [Confirmar]  │
        └────────┬─────────────────┘
                 │ Confirmar
                 ▼
   ┌──────────────────────────────┐
   │ POST /api/defesas/aprovar    │
   │                              │
   │ • defesaId                   │
   │ • chargebackId               │
   │ • dossieMD                   │
   │ • submitToPagarme: true      │
   └────────┬─────────────────────┘
            │
            ▼
   ┌──────────────────────────────┐
   │  Pagar.me API                │
   │  submitChargebackResponse()  │
   └────────┬─────────────────────┘
            │
            ▼
   ┌──────────────────────────────┐
   │  Status: ✓ Enviado           │
   │                              │
   │  Aguardando resposta Pagar.me│
   │  (análise + resultado)       │
   └──────────────────────────────┘
```

---

## 📊 Estados & Transitions

```
┌─────────────────────────────────────────────────────────────┐
│                      DEFESA LIFECYCLE                       │
└─────────────────────────────────────────────────────────────┘

[drafted] → Rascunho (aguardando aprovação)
   │
   ├─ User clica "Enviar"
   │
   ▼
[submitted] → Enviado (resposta em processamento)
   │
   ├─ Pagar.me analisa (7-45 dias)
   │
   ├─ Resultado: Ganho
   │ └─ Status: [won] → 🟢 Ganho
   │
   └─ Resultado: Perdido
      └─ Status: [lost] → 🔴 Perdido
```

---

## 🎨 UI/UX Design System

### Cores
- **Brand**: `#5b6dff` (azul primário)
- **Success**: `#10b981` (verde)
- **Warning**: `#f59e0b` (amarelo)
- **Danger**: `#ef4444` (vermelho)
- **Info**: `#8b5cf6` (roxo - n8n)

### Tipografia
- **Headings**: Inter Bold
- **Body**: Inter Regular
- **Mono**: Monospace (código/IDs)

### Componentes Reutilizáveis
- `<Badge>` - Status, viabilidade, fonte
- `<Card>` - Container principal
- `<Button>` - Primário, secundário, danger
- `<Modal>` - Confirmação, informação
- `<ProgressBar>` - Viabilidade visual

---

## 🔌 Integração com Componentes Existentes

### Layout Existente (`layout.tsx`)
```tsx
// Adicionar link no menu:
<Link href="/defesas">
  📋 Minha Defesas
</Link>
```

### Página Principal (`page.tsx`)
```tsx
// Adicionar botão de atalho:
{showDashboard && (
  <Link href="/defesas" className="btn-secondary">
    📋 Ver Minhas Defesas
  </Link>
)}
```

### Dashboard Component (`Dashboard.tsx`)
```tsx
// Adicionar botão por defesa:
<button onClick={() => router.push(`/defesas/${rascunho.id}`)}>
  📋 Revisar Defesa
</button>
```

---

## 🧪 Como Testar

### 1. Mock n8n Webhook (simulação)
```bash
curl -X POST http://localhost:3000/api/defesas/salvar \
  -H "Content-Type: application/json" \
  -d '{
    "contestacaoId": "test_001",
    "chargebackId": "charge_test_001",
    "dossie": "...",
    "dossieTitulo": "Dossiê de Teste",
    "dossieMD": "# Teste\n\nConteúdo aqui",
    "contestacao": { /* FormContestacao */ },
    "parecer": {
      "tipo": "produto_nao_recebido",
      "viabilidade": 0.85,
      "parecer": "Análise do parecer...",
      "argumentos": ["Arg 1", "Arg 2"],
      "recomendacao": "responder",
      "confianca": 0.92
    },
    "source": "n8n"
  }'
```

### 2. Navegação
- Abrir `http://localhost:3000/defesas`
- Clicar em uma defesa
- Revisar parecer e dossiê
- Testar "Enviar para Pagar.me"

### 3. Validações
- ✅ Modal de confirmação aparece
- ✅ Dados enviados via POST /api/defesas/aprovar
- ✅ Status muda para "Enviado"
- ✅ Pode copiar/download/print do dossiê

---

## 📱 Responsividade

- **Desktop** (1024px+): Layout completo
- **Tablet** (768px+): Cards em 1 coluna
- **Mobile** (< 768px): Menu colapsível, badges wrapping

---

## ♿ Acessibilidade

- ✅ Alt text em ícones
- ✅ Labels em inputs (futuros edits)
- ✅ Cores não são único indicador (text + icon)
- ✅ ARIA labels em modals
- ✅ Keyboard navigation (Tab, Enter, Esc)

---

## 📈 Performance

- ✅ Lazy loading de componentes
- ✅ Markdown renderizado com react-markdown (leve)
- ✅ localStorage para cache local
- ✅ API calls otimizadas (sem waterfalls)

---

## 🚀 Deployment

### Vercel
```bash
git add .
git commit -m "feat: add dashboard defesas UI"
git push origin main
# Vercel auto-deploy
```

### Self-hosted
```bash
npm run build
npm start
# Acessa em http://seu-dominio.com/defesas
```

---

## 📋 Checklist de Conclusão

- [x] Página `/defesas` (lista)
- [x] Página `/defesas/[id]` (detalhe)
- [x] Componente `DossieViewer`
- [x] Componente `ApprovalModal`
- [x] API `/api/defesas/salvar`
- [x] API `/api/defesas/aprovar`
- [x] API `/api/defesas/webhook`
- [x] Documentação (`DASHBOARD_DEFESAS.md`)
- [x] Integração n8n (`N8N_INTEGRATION.md`)
- [ ] Testes E2E
- [ ] Deploy em produção
- [ ] Monitoramento & analytics

---

## 🎓 Próximos Passos

1. **Instalar `react-markdown`**
   ```bash
   npm install react-markdown
   ```

2. **Testar com n8n mock** (veja seção "Como Testar")

3. **Integrar com Pagar.me API** (já existe em `lib/pagarme.ts`)

4. **Adicionar notificações** (Email + Slack quando defesa é gerada)

5. **Analytics** (rastrear % de sucesso por tipo de chargeback)

6. **Template customizado** (permitir editar parecer antes de enviar)

---

## 📞 Suporte

- **Bugs**: Abra issue no repositório
- **Dúvidas**: Ver `DASHBOARD_DEFESAS.md` seção "FAQ"
- **Integração n8n**: Ver `N8N_INTEGRATION.md`
- **Status da defesa**: Verificar em `/defesas/[id]`
