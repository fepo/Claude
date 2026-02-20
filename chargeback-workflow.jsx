import { useState } from "react";

const workflowSteps = [
  {
    id: "trigger",
    title: "1. Webhook — Receber Chargeback",
    icon: "🔔",
    color: "#ef4444",
    details: {
      node: "Webhook Node",
      fonte: "Pagar.me / Stripe / outro gateway",
      dados: [
        "ID do pedido / transaction_id",
        "Valor da disputa",
        "Motivo do chargeback",
        "Dados do cliente (nome, CPF, e-mail)",
        "Data da compra",
      ],
      dica: "No Pagar.me, configure o webhook de 'chargeback' no painel. O payload inclui transaction_id e reason.",
    },
  },
  {
    id: "shopify",
    title: "2. Buscar Pedido no Shopify",
    icon: "🛒",
    color: "#8b5cf6",
    details: {
      node: "Shopify Node / HTTP Request",
      endpoint: "GET /admin/api/orders/{order_id}.json",
      dados: [
        "Status do pedido (fulfilled / unfulfilled)",
        "Código de rastreio",
        "Transportadora",
        "Endereço de entrega",
        "Data do pedido",
        "Itens comprados",
        "Comprovante de pagamento",
      ],
      dica: "Use a API do Shopify com token de acesso. Busque pelo order_name ou transaction_id vinculado.",
    },
  },
  {
    id: "rastreio",
    title: "3. Consultar Status de Entrega",
    icon: "📦",
    color: "#f59e0b",
    details: {
      node: "HTTP Request Node",
      fonte: "API Correios / Jadlog / Kangu / 17Track",
      dados: [
        "Status atual (em trânsito, entregue, tentativa)",
        "Data da última movimentação",
        "Data de entrega (se entregue)",
        "Histórico completo de rastreio",
      ],
      dica: "Para Correios, use a API rastro ou serviços como Melhor Envio / Ship4you que unificam transportadoras.",
    },
  },
  {
    id: "decisao",
    title: "4. IF — Foi Entregue?",
    icon: "⚖️",
    color: "#06b6d4",
    details: {
      node: "IF Node (Switch)",
      condicao: 'tracking_status === "delivered"',
      saidas: [
        "✅ SIM → Caminho de pedido entregue",
        "❌ NÃO → Caminho de pedido em trânsito",
      ],
      dica: "Adicione também uma terceira saída para 'devolvido ao remetente' — caso diferente que pode precisar de outra estratégia.",
    },
  },
  {
    id: "entregue",
    title: "5A. Entregue → Coletar Provas",
    icon: "✅",
    color: "#22c55e",
    details: {
      node: "Merge + HTTP Requests",
      dados: [
        "Comprovante de entrega (POD) da transportadora",
        "Screenshot/dados do rastreio completo",
        "Dados do fulfillment do Shopify",
        "Nota fiscal eletrônica (NF-e)",
        "IP e dados do checkout (anti-fraude)",
        "Confirmação de pedido enviada ao cliente",
      ],
      dica: "Quanto mais evidências, melhor. Pagar.me aceita arquivos PDF na contestação.",
    },
  },
  {
    id: "transito",
    title: "5B. Em Trânsito → Verificar Prazo",
    icon: "🚚",
    color: "#3b82f6",
    details: {
      node: "Code Node + HTTP Request",
      logica: [
        "Calcular prazo de entrega estimado (data pedido + prazo da modalidade)",
        "Verificar política de entrega da empresa",
        "Comparar data atual vs. prazo máximo",
        "Consultar prazo do CDC (Art. 35 / Art. 49)",
      ],
      dica: "No Brasil, o prazo legal de arrependimento (Art. 49 CDC) é de 7 dias APÓS recebimento, não após a compra.",
    },
  },
  {
    id: "claude",
    title: "6. Claude API → Gerar Dossiê",
    icon: "🤖",
    color: "#a855f7",
    details: {
      node: "HTTP Request → API Anthropic",
      prompt_inclui: [
        "Todos os dados coletados nas etapas anteriores",
        "Políticas da empresa (template fixo)",
        "Legislação brasileira aplicável (CDC)",
        "Políticas da bandeira (Visa/Mastercard)",
        "Argumentação jurídica para indeferimento",
      ],
      saida: "Dossiê completo em PDF com argumentação, evidências e conclusão",
      dica: "Use system prompt fixo com as políticas da empresa e regras do CDC. Passe os dados do caso como variáveis.",
    },
  },
  {
    id: "envio",
    title: "7. Enviar Contestação",
    icon: "📤",
    color: "#ec4899",
    details: {
      node: "HTTP Request + Email Node",
      acoes: [
        "Enviar contestação via API do gateway (Pagar.me)",
        "Anexar dossiê PDF na disputa",
        "Notificar equipe via e-mail/Slack/WhatsApp",
        "Registrar caso em planilha/CRM",
        "Salvar dossiê no Google Drive",
      ],
      dica: "A Pagar.me tem endpoint específico para contestar chargebacks. Prazo geralmente é de 7 dias úteis.",
    },
  },
];

const promptTemplate = `Você é um especialista em contestação de chargebacks para e-commerce brasileiro.

DADOS DO CASO:
- Pedido: {{order_id}}
- Cliente: {{customer_name}} (CPF: {{cpf}})
- Data da compra: {{order_date}}
- Valor: R$ {{amount}}
- Motivo do chargeback: {{reason}}
- Status de entrega: {{delivery_status}}
- Código de rastreio: {{tracking_code}}
- Transportadora: {{carrier}}

{{#if delivered}}
EVIDÊNCIAS DE ENTREGA:
- Data de entrega: {{delivery_date}}
- Comprovante: {{pod_data}}
- Rastreio completo: {{tracking_history}}
{{else}}
DADOS DE PRAZO:
- Prazo estimado: {{estimated_delivery}}
- Prazo máximo (política): {{max_delivery_days}} dias úteis
- Status atual: {{current_tracking_status}}
{{/if}}

POLÍTICAS DA EMPRESA:
- Prazo de entrega: {{shipping_policy}}
- Política de reembolso: {{refund_policy}}

INSTRUÇÕES:
Gere um dossiê formal de contestação de chargeback contendo:
1. Resumo do caso
2. Cronologia dos fatos
3. Evidências apresentadas
4. Fundamentação legal (CDC, políticas da bandeira)
5. Conclusão e pedido de indeferimento do reembolso

Tom: formal, objetivo, em português brasileiro.
Formato: pronto para PDF.`;

export default function ChargebackWorkflow() {
  const [selected, setSelected] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  const step = workflowSteps.find((s) => s.id === selected);

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", color: "#e2e8f0", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)", borderBottom: "1px solid #1e293b", padding: "28px 24px 20px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 28 }}>⚡</span>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f8fafc", margin: 0 }}>
              Automação de Chargeback — n8n
            </h1>
          </div>
          <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>
            Workflow completo: receber disputa → verificar entrega → gerar dossiê → contestar
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 24px 40px" }}>
        {/* Flow */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {workflowSteps.map((s, i) => (
            <div key={s.id}>
              <button
                onClick={() => setSelected(selected === s.id ? null : s.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "16px 20px",
                  background: selected === s.id ? "#1e293b" : "transparent",
                  border: `1px solid ${selected === s.id ? s.color + "66" : "#1e293b"}`,
                  borderRadius: 12,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  color: "#e2e8f0",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: s.color + "22",
                    border: `1px solid ${s.color}44`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  {s.icon}
                </div>
                <span style={{ fontSize: 15, fontWeight: 600, textAlign: "left", flex: 1 }}>
                  {s.title}
                </span>
                <span style={{ color: "#64748b", fontSize: 18, transform: selected === s.id ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>
                  ▾
                </span>
              </button>

              {/* Expanded detail */}
              {selected === s.id && step && (
                <div style={{ margin: "0 0 4px 0", padding: "16px 20px 20px", background: "#1e293b", borderRadius: "0 0 12px 12px", borderTop: "none", marginTop: -8 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: step.color + "22", color: step.color, fontWeight: 600 }}>
                      {step.details.node}
                    </span>
                    {step.details.fonte && (
                      <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: "#334155", color: "#94a3b8" }}>
                        {step.details.fonte}
                      </span>
                    )}
                    {step.details.endpoint && (
                      <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: "#334155", color: "#94a3b8", fontFamily: "monospace" }}>
                        {step.details.endpoint}
                      </span>
                    )}
                    {step.details.condicao && (
                      <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: "#334155", color: "#94a3b8", fontFamily: "monospace" }}>
                        {step.details.condicao}
                      </span>
                    )}
                  </div>

                  {(step.details.dados || step.details.saidas || step.details.logica || step.details.prompt_inclui || step.details.acoes) && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                        {step.details.dados ? "Dados coletados" : step.details.saidas ? "Saídas" : step.details.logica ? "Lógica" : step.details.prompt_inclui ? "Prompt inclui" : "Ações"}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {(step.details.dados || step.details.saidas || step.details.logica || step.details.prompt_inclui || step.details.acoes).map((item, j) => (
                          <div key={j} style={{ fontSize: 13, color: "#cbd5e1", padding: "4px 0", display: "flex", gap: 8, alignItems: "flex-start" }}>
                            <span style={{ color: step.color, flexShrink: 0 }}>›</span>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {step.details.saida && (
                    <div style={{ fontSize: 13, color: "#a5f3fc", background: "#164e63", padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>
                      <strong>Output:</strong> {step.details.saida}
                    </div>
                  )}

                  <div style={{ fontSize: 12, color: "#fbbf24", background: "#422006", padding: "8px 12px", borderRadius: 8, lineHeight: 1.5 }}>
                    💡 {step.details.dica}
                  </div>
                </div>
              )}

              {/* Connector line */}
              {i < workflowSteps.length - 1 && (
                <div style={{ display: "flex", justifyContent: "center", padding: "2px 0" }}>
                  <div style={{ width: 2, height: 16, background: i === 3 ? "transparent" : "#334155", position: "relative" }}>
                    {i === 3 && (
                      <div style={{ position: "absolute", left: -30, top: 0, display: "flex", gap: 16 }}>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ width: 2, height: 16, background: "#22c55e", margin: "0 auto" }} />
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div style={{ width: 2, height: 16, background: "#3b82f6", margin: "0 auto" }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Prompt Template Section */}
        <div style={{ marginTop: 32 }}>
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            style={{
              width: "100%",
              padding: "16px 20px",
              background: showPrompt ? "#1e1338" : "transparent",
              border: "1px solid #7c3aed44",
              borderRadius: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12,
              color: "#e2e8f0",
            }}
          >
            <span style={{ fontSize: 20 }}>📝</span>
            <span style={{ fontSize: 15, fontWeight: 600, flex: 1, textAlign: "left" }}>
              Template do Prompt — Claude API
            </span>
            <span style={{ color: "#64748b", fontSize: 18, transform: showPrompt ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▾</span>
          </button>
          {showPrompt && (
            <div style={{ background: "#1e1338", padding: "16px 20px", borderRadius: "0 0 12px 12px", marginTop: -8 }}>
              <pre style={{ fontSize: 12, color: "#c4b5fd", lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "'JetBrains Mono', monospace", margin: 0 }}>
                {promptTemplate}
              </pre>
            </div>
          )}
        </div>

        {/* Integration checklist */}
        <div style={{ marginTop: 24, padding: "20px", background: "#1e293b", borderRadius: 12, border: "1px solid #334155" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px", color: "#f8fafc" }}>
            🔗 Integrações necessárias no n8n
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
            {[
              { name: "Pagar.me / Gateway", tipo: "Webhook + API" },
              { name: "Shopify", tipo: "API REST" },
              { name: "Correios / Melhor Envio", tipo: "API Rastreio" },
              { name: "Claude (Anthropic)", tipo: "API Messages" },
              { name: "Google Drive / S3", tipo: "Salvar dossiê" },
              { name: "Slack / E-mail / Whats", tipo: "Notificações" },
            ].map((int, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #334155" }}>
                <span style={{ fontSize: 13, color: "#e2e8f0" }}>{int.name}</span>
                <span style={{ fontSize: 11, color: "#64748b" }}>{int.tipo}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
