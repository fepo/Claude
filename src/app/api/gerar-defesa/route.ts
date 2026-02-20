import { getShopifyAPI } from "@/lib/shopify";
import type { ShopifyOrder } from "@/lib/shopify";
import type { FormContestacao, EventoRastreio } from "@/types";
import { fetchTrackingEvents } from "@/lib/tracking";

interface GenerarDefesaRequest {
  chargebackId: string;
  chargeId: string;
  orderId: string | null;
  customerName: string;
  customerEmail: string;
  amount: number;
  reason: string;
  rascunho?: FormContestacao;
}

/**
 * Encontra o melhor match entre pedidos Shopify baseado em valor, data e proximidade
 */
function findBestMatch(
  orders: ShopifyOrder[],
  targetAmount: number, // já em BRL (ex: 149.90)
  targetDate?: string   // ISO date string
): ShopifyOrder | null {
  if (!orders.length) return null;

  // Filtrar por valor dentro de 2% de tolerância
  const byAmount = orders.filter((o) => {
    const price = parseFloat(o.totalPrice);
    if (isNaN(price) || targetAmount === 0) return true;
    return Math.abs(price - targetAmount) / targetAmount <= 0.02;
  });

  const pool = byAmount.length > 0 ? byAmount : orders;

  // Ordenar por proximidade de data
  if (targetDate && pool.length > 1) {
    const target = new Date(targetDate).getTime();
    return pool.sort(
      (a, b) =>
        Math.abs(new Date(a.createdAt).getTime() - target) -
        Math.abs(new Date(b.createdAt).getTime() - target)
    )[0];
  }

  return pool[0];
}

export async function POST(req: Request) {
  try {
    const {
      chargebackId,
      orderId,
      customerEmail,
      amount,
      rascunho,
    }: GenerarDefesaRequest = await req.json();

    const steps: Array<{
      name: string;
      status: "pending" | "loading" | "success" | "error";
      message?: string;
    }> = [
      { name: "Pagar.me", status: "success", message: "Dados carregados" },
      { name: "Shopify", status: "loading", message: "Buscando pedido..." },
      { name: "Correios / Transportadora", status: "pending", message: "Aguardando..." },
    ];

    let shopifyOrder = null;
    let trackingEvents: EventoRastreio[] = [];

    // ── Step 2: Buscar na Shopify ────
    try {
      const shopifyAPI = getShopifyAPI();
      if (shopifyAPI) {
        console.log(`[gerar-defesa] email=${customerEmail} | amount=${amount} | numeroPedido=${rascunho?.numeroPedido}`);

        // 1. numeroPedido parece nome Shopify (#1001 ou 1001)?
        const isShopifyName = (v?: string | null) => /^#?\d+$/.test((v ?? "").trim());
        if (isShopifyName(rascunho?.numeroPedido)) {
          shopifyOrder = await shopifyAPI.getOrderByName(rascunho!.numeroPedido!);
        }

        // 2. Fallback: busca por email + filtro por valor + data
        if (!shopifyOrder && customerEmail) {
          const candidates = await shopifyAPI.getOrdersByEmail(customerEmail);
          console.log(`[gerar-defesa] candidatos por email=${candidates.length}`);
          shopifyOrder = findBestMatch(candidates, amount, rascunho?.dataTransacao ?? undefined);
          if (shopifyOrder && candidates.length > 1) {
            const byAmount = candidates.filter((o) => {
              const price = parseFloat(o.totalPrice);
              return Math.abs(price - amount) / amount <= 0.02;
            });
            console.log(`[gerar-defesa] match por valor=${byAmount.length} | selecionado=${shopifyOrder.name}`);
          }
        }

        steps[1].status = "success";
        steps[1].message = shopifyOrder
          ? `Pedido ${shopifyOrder.name} encontrado`
          : "Nenhum pedido encontrado";
      }
    } catch (err) {
      console.error("Erro ao buscar Shopify:", err);
      steps[1].status = "error";
      steps[1].message = "Erro ao buscar pedido";
    }

    // ── Step 3: Buscar rastreamento na Transportadora ────
    try {
      if (shopifyOrder) {
        const fulfillment = shopifyOrder.fulfillments?.find(
          (f) => f.trackingInfo?.number
        );

        if (fulfillment?.trackingInfo?.number) {
          const trackingNumber = fulfillment.trackingInfo.number;
          const carrier = fulfillment.trackingInfo.company || "Desconhecido";

          const trackingResult = await fetchTrackingEvents(trackingNumber, carrier);
          trackingEvents = trackingResult.events;
          steps[2].status = "success";
          steps[2].message = trackingResult.message;
        } else {
          steps[2].status = "success";
          steps[2].message = "Nenhum rastreamento encontrado";
        }
      } else {
        steps[2].status = "pending";
        steps[2].message = "Pedido não encontrado na Shopify";
      }
    } catch (err) {
      console.error("Erro ao buscar rastreamento:", err);
      steps[2].status = "error";
      steps[2].message = "Erro ao buscar rastreamento";
    }

    // ── Monta FormContestacao enriquecida ────
    const enrichedForm: FormContestacao = {
      // Defaults
      gateway: rascunho?.gateway || "pagarme",
      contestacaoId: rascunho?.contestacaoId || chargebackId,
      dataContestacao: rascunho?.dataContestacao || new Date().toISOString().split("T")[0],
      tipoContestacao: rascunho?.tipoContestacao || "desacordo_comercial",
      bandeira: rascunho?.bandeira || "",
      finalCartao: rascunho?.finalCartao || "",
      dataTransacao: rascunho?.dataTransacao || new Date().toISOString().split("T")[0],
      cpfCliente: rascunho?.cpfCliente || "",
      enderecoFaturamento: rascunho?.enderecoFaturamento || "",
      ipComprador: rascunho?.ipComprador || "",
      comunicacoes: rascunho?.comunicacoes || [],
      nomeEmpresa: rascunho?.nomeEmpresa || "",
      cnpjEmpresa: rascunho?.cnpjEmpresa || "",
      emailEmpresa: rascunho?.emailEmpresa || "",
      telefoneEmpresa: rascunho?.telefoneEmpresa || "",
      enderecoEmpresa: rascunho?.enderecoEmpresa || "",
      politicaReembolsoUrl: rascunho?.politicaReembolsoUrl || "",
      // Dados Shopify
      nomeCliente:
        rascunho?.nomeCliente ||
        (shopifyOrder?.customer
          ? `${shopifyOrder.customer.firstName} ${shopifyOrder.customer.lastName}`.trim()
          : ""),
      emailCliente:
        rascunho?.emailCliente || shopifyOrder?.customer?.email || "",
      numeroPedido: rascunho?.numeroPedido || shopifyOrder?.name || orderId || "",
      valorTransacao:
        rascunho?.valorTransacao || shopifyOrder?.totalPrice || String(amount),
      itensPedido:
        shopifyOrder?.lineItems && shopifyOrder.lineItems.length > 0
          ? shopifyOrder.lineItems.map((item) => ({
              descricao: item.title,
              valor: item.price,
            }))
          : rascunho?.itensPedido || [{ descricao: "Pedido", valor: String(amount) }],
      enderecoEntrega:
        rascunho?.enderecoEntrega ||
        (shopifyOrder?.customer?.defaultAddress
          ? `${shopifyOrder.customer.defaultAddress.address1}, ${shopifyOrder.customer.defaultAddress.city}, ${shopifyOrder.customer.defaultAddress.province}, ${shopifyOrder.customer.defaultAddress.zip}`
          : ""),
      // Rastreamento
      transportadora:
        rascunho?.transportadora ||
        shopifyOrder?.fulfillments?.[0]?.trackingInfo?.company ||
        "",
      codigoRastreio:
        rascunho?.codigoRastreio ||
        shopifyOrder?.fulfillments?.[0]?.trackingInfo?.number ||
        "",
      eventosRastreio:
        trackingEvents.length > 0 ? trackingEvents : rascunho?.eventosRastreio || [],
      codigoConfirmacao: rascunho?.codigoConfirmacao || "",
    };

    return Response.json({
      success: true,
      chargebackId,
      steps,
      shopifyOrder: shopifyOrder ? { name: shopifyOrder.name } : null,
      trackingCount: trackingEvents.length,
      formData: enrichedForm,
    });
  } catch (error) {
    console.error("Erro em gerar-defesa:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
