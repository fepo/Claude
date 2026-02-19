import type { FormContestacao } from "@/types";
import type { ShopifyOrder } from "@/lib/shopify";

interface ChargebackData {
  id: string;
  chargeId: string;
  status: string;
  amount: number;
  reason: string;
  createdAt: string;
}

interface DossieRequest {
  contestacao: FormContestacao;
  chargebackData: ChargebackData;
  shopifyOrder?: ShopifyOrder | null;
}

/**
 * Formata data ISO para formato brasileiro
 */
function formatDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoDate;
  }
}

/**
 * Formata valor monetário em BRL
 */
function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `R$ ${num.toFixed(2)}`;
}

/**
 * Compila o dossiê de defesa
 */
function compilaDossie(req: DossieRequest): { dossie: string; titulo: string; temShopify: boolean } {
  const { contestacao, chargebackData, shopifyOrder } = req;
  const temShopify = !!shopifyOrder;

  const titulo = `Dossiê de Defesa - Chargeback ${chargebackData.id}`;

  const linhas: string[] = [];

  // Cabeçalho
  linhas.push(`# ${titulo}\n`);
  linhas.push(`**Data de Geração**: ${formatDate(new Date().toISOString())}`);
  linhas.push(`**ID da Contestação**: ${chargebackData.id}`);
  linhas.push(`**ID do Charge**: ${chargebackData.chargeId}\n`);

  // ===== SEÇÃO 1: INFORMAÇÕES DA DISPUTA =====
  linhas.push("## 1. Informações da Disputa\n");
  linhas.push(`**Status**: ${chargebackData.status}`);
  linhas.push(`**Motivo**: ${chargebackData.reason}`);
  linhas.push(`**Valor em Disputa**: ${formatCurrency(chargebackData.amount)}`);
  linhas.push(`**Data da Disputa**: ${formatDate(chargebackData.createdAt)}\n`);

  // ===== SEÇÃO 2: DADOS DA TRANSAÇÃO =====
  linhas.push("## 2. Dados da Transação\n");
  linhas.push(`**Data da Transação**: ${formatDate(contestacao.dataTransacao)}`);
  linhas.push(`**Valor da Transação**: ${formatCurrency(contestacao.valorTransacao)}`);
  if (contestacao.bandeira) linhas.push(`**Bandeira**: ${contestacao.bandeira}`);
  if (contestacao.finalCartao) linhas.push(`**Últimos 4 Dígitos**: ${contestacao.finalCartao}`);
  linhas.push(`**Número do Pedido**: ${contestacao.numeroPedido}`);
  if (contestacao.codigoConfirmacao)
    linhas.push(`**Código de Confirmação**: ${contestacao.codigoConfirmacao}\n`);
  else linhas.push("");

  // ===== SEÇÃO 3: DADOS DO CLIENTE =====
  linhas.push("## 3. Dados do Cliente\n");
  linhas.push(`**Nome**: ${contestacao.nomeCliente}`);
  linhas.push(`**Email**: ${contestacao.emailCliente}`);
  if (contestacao.cpfCliente) linhas.push(`**CPF**: ${contestacao.cpfCliente}`);
  if (contestacao.enderecoEntrega) linhas.push(`**Endereço de Entrega**: ${contestacao.enderecoEntrega}`);
  if (contestacao.ipComprador) linhas.push(`**IP do Comprador**: ${contestacao.ipComprador}\n`);
  else linhas.push("");

  // ===== SEÇÃO 4: ITENS DO PEDIDO =====
  linhas.push("## 4. Itens do Pedido\n");

  if (contestacao.itensPedido && contestacao.itensPedido.length > 0) {
    contestacao.itensPedido.forEach((item, idx) => {
      linhas.push(`${idx + 1}. **${item.descricao}** - ${formatCurrency(item.valor)}`);
    });
  } else {
    linhas.push("_Nenhum item registrado_");
  }

  // Se houver Shopify, comparar itens
  if (shopifyOrder && shopifyOrder.lineItems.length > 0) {
    linhas.push("\n**Itens na Shopify**:");
    shopifyOrder.lineItems.forEach((item, idx) => {
      linhas.push(
        `${idx + 1}. **${item.title}** (Qtd: ${item.quantity}) - ${formatCurrency(item.price)}`
      );
      if (item.sku) linhas.push(`   SKU: ${item.sku}`);
    });

    // Verificar divergências
    if (
      contestacao.itensPedido.length !== shopifyOrder.lineItems.length
    ) {
      linhas.push(
        "\n⚠️ **ALERTA**: Número de itens diverge entre Pagar.me e Shopify"
      );
    }
  }
  linhas.push("");

  // ===== SEÇÃO 5: RASTREAMENTO =====
  linhas.push("## 5. Rastreamento e Entrega\n");
  if (contestacao.transportadora) linhas.push(`**Transportadora**: ${contestacao.transportadora}`);
  if (contestacao.codigoRastreio) linhas.push(`**Código de Rastreio**: ${contestacao.codigoRastreio}`);

  if (contestacao.eventosRastreio && contestacao.eventosRastreio.length > 0) {
    linhas.push("\n**Eventos de Rastreamento**:");
    contestacao.eventosRastreio.forEach((evento) => {
      linhas.push(`- **${formatDate(evento.data)}**: ${evento.descricao}`);
    });
  } else {
    linhas.push("_Nenhum evento de rastreamento registrado_");
  }
  linhas.push("");

  // ===== SEÇÃO 6: DADOS SHOPIFY (se disponível) =====
  if (shopifyOrder) {
    linhas.push("## 6. Dados da Shopify\n");
    linhas.push(`**Nome do Pedido**: ${shopifyOrder.name}`);
    linhas.push(`**Email do Cliente**: ${shopifyOrder.email}`);
    linhas.push(`**Data de Criação**: ${formatDate(shopifyOrder.createdAt)}`);

    if (shopifyOrder.customer) {
      linhas.push(`**Cliente**: ${shopifyOrder.customer.firstName} ${shopifyOrder.customer.lastName}`);
      if (shopifyOrder.customer.phone) linhas.push(`**Telefone**: ${shopifyOrder.customer.phone}`);
      if (shopifyOrder.customer.defaultAddress) {
        const addr = shopifyOrder.customer.defaultAddress;
        linhas.push(`**Endereço**: ${addr.address1}, ${addr.city} - ${addr.province} ${addr.zip}`);
      }
    }

    linhas.push(`\n**Status Financeiro**: ${shopifyOrder.financialStatus}`);
    linhas.push(`**Status de Fulfillment**: ${shopifyOrder.fulfillmentStatus || "Pendente"}`);

    if (shopifyOrder.fulfillments && shopifyOrder.fulfillments.length > 0) {
      linhas.push("\n**Fulfillments**:");
      shopifyOrder.fulfillments.forEach((fulfillment, idx) => {
        linhas.push(`${idx + 1}. **Status**: ${fulfillment.status}`);
        linhas.push(`   Data: ${formatDate(fulfillment.createdAt)}`);
        if (fulfillment.trackingInfo) {
          if (fulfillment.trackingInfo.number)
            linhas.push(`   Rastreio: ${fulfillment.trackingInfo.number}`);
          if (fulfillment.trackingInfo.company)
            linhas.push(`   Transportadora: ${fulfillment.trackingInfo.company}`);
          if (fulfillment.trackingInfo.url)
            linhas.push(`   URL: ${fulfillment.trackingInfo.url}`);
        }
      });
    }

    linhas.push(`\n**Total**: ${formatCurrency(shopifyOrder.totalPrice)}`);
    linhas.push(`**Moeda**: ${shopifyOrder.currency}\n`);
  }

  // ===== SEÇÃO 7: ANÁLISE AUTOMÁTICA DE RISCO =====
  linhas.push("## 7. Análise de Risco\n");

  const analise: string[] = [];

  // Verifica se pedido foi entregue
  if (shopifyOrder) {
    if (shopifyOrder.fulfillmentStatus === "fulfilled") {
      analise.push("✓ Pedido foi marcado como entregue na Shopify");
    } else if (shopifyOrder.fulfillmentStatus === "partial") {
      analise.push("⚠️ Pedido foi parcialmente entregue na Shopify");
    }

    // Verifica se há eventos de rastreamento
    if (
      contestacao.eventosRastreio &&
      contestacao.eventosRastreio.length > 0
    ) {
      const ultimoEvento = contestacao.eventosRastreio[contestacao.eventosRastreio.length - 1];
      if (
        ultimoEvento.descricao.toLowerCase().includes("entregue") ||
        ultimoEvento.descricao.toLowerCase().includes("delivered")
      ) {
        analise.push("✓ Último evento indica entrega ao destinatário");
      }
    }

    // Verifica status financeiro
    if (shopifyOrder.financialStatus === "paid") {
      analise.push("✓ Pagamento foi confirmado pela Shopify");
    }
  }

  // Verifica se há comunicações com cliente
  if (contestacao.comunicacoes && contestacao.comunicacoes.length > 0) {
    analise.push(`✓ ${contestacao.comunicacoes.length} comunicação(ões) com cliente documentada(s)`);
  }

  // Verifica se há política de reembolso
  if (contestacao.politicaReembolsoUrl) {
    analise.push("✓ Política de reembolso documentada");
  }

  if (analise.length === 0) {
    linhas.push("_Nenhuma evidência coletada automaticamente_");
  } else {
    analise.forEach((item) => linhas.push(item));
  }

  linhas.push("");

  // ===== SEÇÃO 8: COMUNICAÇÕES (se houver) =====
  if (contestacao.comunicacoes && contestacao.comunicacoes.length > 0) {
    linhas.push("## 8. Comunicações com Cliente\n");
    contestacao.comunicacoes.forEach((com, idx) => {
      linhas.push(
        `${idx + 1}. **${formatDate(com.data)}** (${com.tipo}): ${com.descricao}`
      );
    });
    linhas.push("");
  }

  // ===== SEÇÃO 9: DADOS DA EMPRESA =====
  linhas.push("## 9. Dados da Empresa\n");
  if (contestacao.nomeEmpresa) linhas.push(`**Razão Social**: ${contestacao.nomeEmpresa}`);
  if (contestacao.cnpjEmpresa) linhas.push(`**CNPJ**: ${contestacao.cnpjEmpresa}`);
  if (contestacao.emailEmpresa) linhas.push(`**Email**: ${contestacao.emailEmpresa}`);
  if (contestacao.telefoneEmpresa) linhas.push(`**Telefone**: ${contestacao.telefoneEmpresa}`);
  if (contestacao.enderecoEmpresa) linhas.push(`**Endereço**: ${contestacao.enderecoEmpresa}`);

  // Rodapé
  linhas.push("\n---");
  linhas.push(`\n_Dossiê gerado automaticamente em ${formatDate(new Date().toISOString())}_`);
  if (temShopify) {
    linhas.push(
      "_✓ Inclui dados enriquecidos da Shopify_"
    );
  } else {
    linhas.push("_⚠️ Dados Shopify não disponíveis_");
  }

  return {
    dossie: linhas.join("\n"),
    titulo,
    temShopify,
  };
}

export async function POST(request: Request) {
  try {
    const body: DossieRequest = await request.json();

    if (!body.contestacao || !body.chargebackData) {
      return Response.json(
        { error: "contestacao e chargebackData são obrigatórios" },
        { status: 400 }
      );
    }

    const { dossie, titulo, temShopify } = compilaDossie(body);

    return Response.json({
      success: true,
      dossie,
      titulo,
      temShopify,
    });
  } catch (error) {
    console.error("Erro ao gerar dossiê:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao gerar dossiê",
      },
      { status: 500 }
    );
  }
}
