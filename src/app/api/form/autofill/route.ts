import type { FormContestacao } from "@/types";
import { getShopifyAPI } from "@/lib/shopify";
import type { ShopifyOrder } from "@/lib/shopify";
import { getPagarmeAPI } from "@/lib/pagarme";
import { fetchTrackingEvents } from "@/lib/tracking";

interface AutoFillBody {
  form: FormContestacao;
}

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) {
    if (value.length === 0) return true;
    if (value.length === 1 && typeof value[0] === "object" && value[0] !== null) {
      return Object.values(value[0] as Record<string, unknown>).every((entry) =>
        isEmptyValue(entry)
      );
    }
    return false;
  }
  return false;
}

function mergeForms(current: FormContestacao, incoming: Partial<FormContestacao>): FormContestacao {
  const merged: FormContestacao = { ...current };

  (Object.keys(current) as Array<keyof FormContestacao>).forEach((key) => {
    const currentValue = current[key];
    const incomingValue = incoming[key];
    if (incomingValue === undefined) return;

    if (isEmptyValue(currentValue) && !isEmptyValue(incomingValue)) {
      (merged as any)[key] = incomingValue;
    }
  });

  return merged;
}

function amountToNumber(input?: string): number {
  const raw = (input || "").replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : 0;
}

function findBestMatch(orders: ShopifyOrder[], targetAmount: number, targetDate?: string): ShopifyOrder | null {
  if (!orders.length) return null;

  const byAmount = orders.filter((order) => {
    const price = parseFloat(order.totalPrice);
    if (isNaN(price) || targetAmount === 0) return true;
    return Math.abs(price - targetAmount) / targetAmount <= 0.02;
  });

  const pool = byAmount.length > 0 ? byAmount : orders;

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

function formatShopifyAddress(order?: ShopifyOrder | null): string {
  const address = order?.customer?.defaultAddress;
  if (!address) return "";
  return [address.address1, address.city, address.province, address.zip].filter(Boolean).join(", ");
}

export async function POST(req: Request) {
  try {
    const { form }: AutoFillBody = await req.json();
    if (!form) {
      return Response.json({ success: false, error: "Formulário não informado" }, { status: 400 });
    }

    const steps: Array<{
      name: string;
      status: "pending" | "loading" | "success" | "error";
      message?: string;
    }> = [
      { name: "Pagar.me", status: "loading", message: "Buscando transação..." },
      { name: "Shopify", status: "loading", message: "Buscando pedido..." },
      { name: "Correios / Transportadora", status: "pending", message: "Aguardando rastreio..." },
    ];

    const patch: Partial<FormContestacao> = {};
    let shopifyOrder: ShopifyOrder | null = null;

    try {
      const pagarme = getPagarmeAPI();
      const chargeId = form.codigoConfirmacao || form.contestacaoId;

      if (chargeId) {
        const charge = await pagarme.getCharge(chargeId);
        patch.bandeira = charge?.payment_method?.card?.brand || "";
        patch.finalCartao = charge?.payment_method?.card?.last_four_digits || "";
        patch.dataTransacao = charge?.created_at?.split("T")?.[0] || "";
        patch.emailCliente = charge?.customer?.email || "";
        patch.nomeCliente = charge?.customer?.name || "";
        patch.valorTransacao = charge?.amount ? (charge.amount / 100).toFixed(2) : "";
        steps[0].status = "success";
        steps[0].message = "Dados de pagamento carregados";
      } else {
        steps[0].status = "success";
        steps[0].message = "Sem ID para consulta no Pagar.me";
      }
    } catch (error) {
      console.error("[autofill] erro Pagar.me:", error);
      steps[0].status = "error";
      steps[0].message = "Não foi possível buscar no Pagar.me";
    }

    try {
      const shopify = getShopifyAPI();
      if (!shopify) {
        steps[1].status = "success";
        steps[1].message = "Shopify não configurado";
      } else {
        const isShopifyName = (v?: string | null) => /^#?\d+$/.test((v ?? "").trim());
        if (isShopifyName(form.numeroPedido)) {
          shopifyOrder = await shopify.getOrderByName(form.numeroPedido);
        }

        if (!shopifyOrder && form.emailCliente) {
          const candidates = await shopify.getOrdersByEmail(form.emailCliente);
          const targetAmount = amountToNumber(form.valorTransacao || patch.valorTransacao);
          shopifyOrder = findBestMatch(candidates, targetAmount, form.dataTransacao || patch.dataTransacao);
        }

        if (shopifyOrder) {
          patch.numeroPedido = shopifyOrder.name;
          patch.valorTransacao = shopifyOrder.totalPrice;
          patch.emailCliente = shopifyOrder.customer?.email || patch.emailCliente || "";
          patch.nomeCliente =
            `${shopifyOrder.customer?.firstName || ""} ${shopifyOrder.customer?.lastName || ""}`.trim() ||
            patch.nomeCliente ||
            "";
          patch.enderecoEntrega = formatShopifyAddress(shopifyOrder);
          patch.itensPedido =
            shopifyOrder.lineItems?.map((item) => ({ descricao: item.title, valor: item.price })) || [];
          patch.transportadora = shopifyOrder.fulfillments?.[0]?.trackingInfo?.company || patch.transportadora || "";
          patch.codigoRastreio = shopifyOrder.fulfillments?.[0]?.trackingInfo?.number || patch.codigoRastreio || "";
          steps[1].status = "success";
          steps[1].message = `Pedido ${shopifyOrder.name} encontrado`;
        } else {
          steps[1].status = "success";
          steps[1].message = "Pedido não encontrado";
        }
      }
    } catch (error) {
      console.error("[autofill] erro Shopify:", error);
      steps[1].status = "error";
      steps[1].message = "Não foi possível buscar na Shopify";
    }

    const trackingNumber = patch.codigoRastreio || form.codigoRastreio;
    const trackingCarrier = patch.transportadora || form.transportadora;
    if (trackingNumber) {
      const tracking = await fetchTrackingEvents(trackingNumber, trackingCarrier);
      patch.eventosRastreio = tracking.events;
      if (!patch.transportadora && /correios/i.test(tracking.message)) {
        patch.transportadora = "Correios";
      }
      steps[2].status = "success";
      steps[2].message = tracking.message;
    } else {
      steps[2].status = "success";
      steps[2].message = "Sem código de rastreio";
    }

    const merged = mergeForms(form, patch);

    return Response.json({
      success: true,
      steps,
      form: merged,
    });
  } catch (error) {
    console.error("[autofill] erro geral:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
