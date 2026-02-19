# Dashboard de Defesas - Guia de Uso

## Visão Geral

O Dashboard de Defesas permite que você **revise, edite e aprove** as defesas geradas automaticamente pelo n8n ou manualmente pelo seu time, antes de enviá-las para a Pagar.me.

---

## Fluxo de Uso

```
1. Chargeback chega (via Pagar.me webhook)
   ↓
2. n8n gera defesa automaticamente
   ├─ Claude Triagem (classifica tipo)
   ├─ Claude Redação (parecer jurídico)
   └─ Salva em /api/defesas/salvar
   ↓
3. Você acessa /defesas
   ├─ Vê lista de defesas em rascunho
   └─ Filtra por automáticas ou manuais
   ↓
4. Clica em uma defesa para revisar
   ├─ Vê parecer jurídico completo
   ├─ Vê viabilidade (%) da defesa
   ├─ Vê argumentos principais
   ├─ Lê dossiê completo (markdown)
   └─ Revê dados Shopify se enriquecido
   ↓
5. Aprova e envia para Pagar.me
   └─ Status muda para "Enviado"
```

---

## Páginas e Componentes

### 1. **Página: `/defesas`**

**Propósito**: Listar todas as defesas (rascunhos, enviadas, ganhas, perdidas)

**Layout**:
```
┌────────────────────────────────────────────────────┐
│ 📋 Minhas Defesas                        [← Voltar]│
│ Revise e aprove as defesas geradas      Suport     │
├────────────────────────────────────────────────────┤
│ Filtros:                                           │
│ [Todas: 12]  [🤖 Automáticas: 8]  [✋ Manuais: 4] │
├────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐    │
│ │ Dossiê - Chargeback CB-001                  │    │
│ │ Status: 🟡 Rascunho   🤖 Auto   2 dias atrás  │
│ │                                             │    │
│ │ Tipo: Produto não recebido                  │    │
│ │ Viabilidade: [====●   ] 85% | 92% confiança │
│ │                                             │    │
│ │ ✓ RESPONDER (recomendado)                   │    │
│ │                                             │    │
│ │ Cliente: João Silva          Gerado: 18:30  │    │
│ │                              Ver detalhes → │    │
│ └─────────────────────────────────────────────┘    │
│ ┌─────────────────────────────────────────────┐    │
│ │ Dossiê - Chargeback CB-002                  │    │
│ │ ... (mais defesas)                          │    │
│ └─────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────┘
```

**Features**:
- ✓ Listar todas as defesas com filtro
- ✓ Badges de status (Rascunho, Enviado, Ganho, Perdido)
- ✓ Badges de fonte (n8n Auto, Manual)
- ✓ Viabilidade visual (barra de progresso)
- ✓ Confiança da IA
- ✓ Link direto para revisar

### 2. **Página: `/defesas/[id]`**

**Propósito**: Revisar defesa completa e aprovar envio

**Layout**:
```
┌────────────────────────────────────────────────────┐
│ Dossiê de Defesa - Chargeback CB-001     [← Voltar]│
│ Chargeback: charge_xxxxx                           │
├────────────────────────────────────────────────────┤
│ 🟡 Rascunho    🤖 Automática   Gerado: 18:30      │
├────────────────────────────────────────────────────┤
│                                                    │
│ 📊 PARECER JURÍDICO                                │
│ ┌──────────────────────────────────────────────┐  │
│ │ Tipo: Produto não recebido                  │  │
│ │ Viabilidade: [====●  ] 85%  |  Confiança: 92% │  │
│ │                                              │  │
│ │ ✓ RECOMENDADO RESPONDER                     │  │
│ │                                              │  │
│ │ Argumentos Principais:                      │  │
│ │ ✓ Rastreamento confirma entrega            │  │
│ │ ✓ Data de entrega anterior ao chargeback   │  │
│ │ ✓ Cliente não apresentou prova             │  │
│ │                                              │  │
│ │ Parecer Completo:                           │  │
│ │ "Art. 42-A e 49 do CDC. O cliente...       │  │
│ │  [mais texto jurídico]...                  │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ 📄 DOSSIÊ DE DEFESA                                │
│ ┌──────────────────────────────────────────────┐  │
│ │ [👁️ Formatado] [</> Raw]                     │  │
│ │ [Copiar]  [MD]  [PDF]                       │  │
│ │                                              │  │
│ │ # Dossiê de Defesa - Chargeback CB-001     │  │
│ │                                              │  │
│ │ ## 1. Informações da Disputa                │  │
│ │ Status: aberto                              │  │
│ │ Motivo: Produto não recebido               │  │
│ │ ...                                         │  │
│ │ [Scroll para ver mais]                     │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ 🛒 DADOS SHOPIFY ENRIQUECIDOS                      │
│ ┌──────────────────────────────────────────────┐  │
│ │ ID Pedido: #1001                            │  │
│ │ Fulfillment: Entregue                       │  │
│ │ Status Financeiro: Pago                     │  │
│ │ Rastreio: BR123456789 (Correios)           │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ 👤 DADOS DO CLIENTE                                │
│ ┌──────────────────────────────────────────────┐  │
│ │ Nome: João Silva                            │  │
│ │ Email: joao@example.com                    │  │
│ │ CPF: 123.456.789-00                        │  │
│ │ Endereço: Rua X, 123, São Paulo - SP      │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ [← Voltar]  [👁️ Revisar]  [✓ Enviar para Pagar.me] │
└────────────────────────────────────────────────────┘
```

**Features**:
- ✓ Parecer jurídico completo com recomendação
- ✓ Viabilidade e confiança visuales
- ✓ Argumentos principais listados
- ✓ Dossiê em markdown (view formatado ou raw)
- ✓ Copy, Download MD, Print to PDF
- ✓ Dados Shopify enriquecidos
- ✓ Dados do cliente
- ✓ Botão de aprovação com confirmação modal

### 3. **Componente: `DossieViewer`**

**Propósito**: Exibir dossiê markdown com opções de visualização e export

**Componentes**:
- Toggle view: Formatado vs Raw
- Botão Copiar (clipboard)
- Botão Download (MD)
- Botão Print (PDF via window.print())
- Stats: linhas, palavras, caracteres

### 4. **Componente: `ApprovalModal`**

**Propósito**: Modal de confirmação antes de enviar para Pagar.me

**Componentes**:
- Checklist de verificação
- Aviso sobre viabilidade baixa
- IDs para referência
- Botões: Cancelar, Confirmar Envio

---

## Como Usar na Prática

### **Cenário 1: Revisar Defesa Gerada pelo n8n**

1. Você recebe notificação: "Defesa gerada para chargeback CB-001"
2. Acessa `/defesas`
3. Vê a defesa em "Rascunho" com 🤖 (automática)
4. Clica "Ver detalhes →"
5. Lê o parecer jurídico (viabilidade 85%)
6. Revisa o dossiê completo
7. Clica "✓ Enviar para Pagar.me"
8. Confirma no modal
9. Defesa enviada! Status muda para "✓ Enviado"

### **Cenário 2: Rejeitar Defesa (Viabilidade Baixa)**

1. Abre defesa com viabilidade 35% (vermelho)
2. Lê parecer: "⚠️ NÃO RECOMENDADO RESPONDER"
3. Volta para `/defesas` sem enviar
4. Clica "... Revisar Modificações" (futuro)
5. Edita dados para melhorar viabilidade
6. Salva como nova versão

### **Cenário 3: Exportar Defesa para Arquivo**

1. Abre defesa
2. Clica "Copy" → cola em editor de texto
3. Ou clica "MD" → download do arquivo markdown
4. Ou clica "PDF" → abre janela print → salva como PDF

---

## Estados de Status

| Status | Cor | Significado | Ações Disponíveis |
|--------|-----|------------|-------------------|
| **Rascunho** | 🟡 Amarelo | Aguardando aprovação | Enviar, Revisar |
| **Enviado** | 🔵 Azul | Já foi para Pagar.me | Ver, Copiar |
| **Ganho** | 🟢 Verde | Chargeback ganho! | Ver (read-only) |
| **Perdido** | 🔴 Vermelho | Chargeback perdido | Ver, Editar nova |

---

## Recomendações de Uso

### ✅ Quando Enviar (Viabilidade >= 75%)

- Rastreamento claro de entrega
- Foto/vídeo do produto
- Comunicações com cliente documentadas
- Assinatura de entrega
- Referências da Shopify

### ⚠️ Quando Acompanhar (50% <= Viabilidade < 75%)

- Dados incompletos
- Evidências fracas
- Razão do chargeback ambígua
- Recomendação: complementar informações

### ❌ Quando Não Enviar (Viabilidade < 50%)

- Sem prova de entrega
- Cliente reportou não recebimento
- Sem comunicações documentadas
- Recomendação: não responder (timeout)

---

## Dicas de Otimização

1. **Enriqueça com Shopify**: Sempre conecte Shopify para adicionar fulfillment + rastreio
2. **Revise o Parecer**: Leia a recomendação da IA (viabilidade %)
3. **Documente Tudo**: Adicione eventos de rastreamento e comunicações
4. **Atento aos Prazos**: Chargebacks têm janelas de resposta (geralmente 7-45 dias)
5. **Backup**: Download do markdown antes de enviar

---

## Troubleshooting

| Problema | Causa | Solução |
|----------|-------|---------|
| Defesa não aparece em `/defesas` | Não foi salva corretamente | Verificar log em `/api/defesas/salvar` |
| Viabilidade baixa (< 50%) | Dados incompletos | Adicionar rastreio, comunicações, CPF |
| Botão "Enviar" desabilitado | Status não é "Rascunho" | Defesa já foi enviada ou está em outro status |
| Parecer não carrega | Claude API timeout | Recarregar página ou tentar mais tarde |
| Shopify não enriquece | Token inválido | Verificar `SHOPIFY_API_ACCESS_TOKEN` |

---

## Próximas Funcionalidades

- [ ] Editar defesa antes de enviar
- [ ] Histórico de versões
- [ ] Comparação antes/depois
- [ ] Integração com Slack/Email (notificações)
- [ ] Análise de sucesso por tipo de chargeback
- [ ] Template de parecer customizado por time
- [ ] API webhook para status updates da Pagar.me

---

## Contato e Suporte

Para dúvidas sobre:
- **Defesas**: Entre em contato com seu time jurídico
- **Bugs no Dashboard**: Abra issue no repositório
- **Integração n8n**: Veja `N8N_INTEGRATION.md`
- **Dados Shopify**: Verifique `SHOPIFY_API_ACCESS_TOKEN`
