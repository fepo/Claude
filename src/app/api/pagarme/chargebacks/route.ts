import { PagarmeAPI } from "@/lib/pagarme";
import { getShopifyAPI } from "@/lib/shopify";
import type { FormContestacao } from "@/types";
import type { ShopifyOrder } from "@/lib/shopify";
import crypto from "crypto";

// ─── Blob helpers ─────────────────────────────────────────────────────────────
// Usa @vercel/blob para persistência entre serverless instances no Vercel.
// Fallback gracioso se BLOB_READ_WRITE_TOKEN não estiver configurado.

const BLOB_KEY = "chargebacks-store.json";

async function readStore(): Promise<any[]> {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: BLOB_KEY });
    if (!blobs.length) return [];
    const res = await fetch(blobs[0].url);
    return await res.json();
  } catch {
    // Fallback: memória global
    const g = globalThis as any;
    return g._cbstore ?? [];
  }
}

async function writeStore(data: any[]) {
  try {
    const { put } = await import("@vercel/blob");
    await put(BLOB_KEY, JSON.stringify(data), {
      access: "public",
      contentType: "application/json",
      allowOverwrite: true,
    });
  } catch {
    // Fallback: memória global
    const g = globalThis as any;
    g._cbstore = data;
  }
}

/**
 * Encontra o melhor match entre pedidos Shopify baseado em valor e data
 */
function findBestMatch(
  orders: ShopifyOrder[],
  targetAmount: number,
  targetDate?: string
): ShopifyOrder | null {
  if (!orders.length) return null;

  const byAmount = orders.filter((o) => {
    const price = parseFloat(o.totalPrice);
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

// ─── POST /api/pagarme/chargebacks ──────────────────────────────────────────
// Recebe webhook do Pagar.me, valida assinatura e persiste o chargeback.

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("x-pagar-me-signature");
    const webhookSecret = process.env.PAGARME_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return new Response("Webhook secret not configured", { status: 500 });
    }

    if (!signature) {
      return new Response("Missing signature", { status: 401 });
    }

    const bodyText = await req.text();

    // Valida HMAC SHA-256
    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(bodyText)
      .digest("hex");

    if (signature !== expected) {
      console.warn("Assinatura de webhook inválida");
      return new Response("Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(bodyText);

    // Ignora eventos que não são de chargeback (retorna 200 para não reenviar)
    if (
      payload.type !== "charge.chargebacked" &&
      payload.type !== "chargeback.created"
    ) {
      return Response.json({ received: true, ignored: true });
    }

    const d = payload.data;
    const chargeId = d.charge_id || d.id;
    const orderId = d.order_id;
    const amount = d.amount || 0;
    const reason = d.reason || "Chargeback";

    // Enriquece com dados da API (opcional — só se PAGARME_API_KEY configurado)
    let orderData: any = null;
    let chargeData: any = null;
    const apiKey = process.env.PAGARME_API_KEY;
    if (apiKey) {
      try {
        const pagarme = new PagarmeAPI(apiKey);
        if (orderId) orderData = await pagarme.getOrder(orderId);
        chargeData = await pagarme.getCharge(chargeId);
      } catch (e) {
        console.error("Erro ao enriquecer dados:", e);
      }
    }

    // Enriquece com dados da Shopify (se configurado)
    let shopifyOrder: ShopifyOrder | null = null;
    const shopifyAPI = getShopifyAPI();
    if (shopifyAPI) {
      const customerEmail = orderData?.customer?.email || chargeData?.customer?.email;
      const amountBRL = amount / 100;
      const dataTransacao = chargeData?.created_at?.split("T")[0];
      try {
        if (customerEmail) {
          const candidates = await shopifyAPI.getOrdersByEmail(customerEmail);
          shopifyOrder = findBestMatch(candidates, amountBRL, dataTransacao);
          if (shopifyOrder) {
            console.log(
              `[webhook] Match Shopify: ${shopifyOrder.name} para ${customerEmail}`
            );
          }
        }
      } catch (e) {
        console.error("Erro ao buscar Shopify:", e);
      }
    }

    const rascunho: FormContestacao = {
      gateway: "pagarme",
      contestacaoId: d.id || `cb_${Date.now()}`,
      dataContestacao: new Date().toISOString().split("T")[0],
      tipoContestacao: inferirTipo(reason),
      valorTransacao: (amount / 100).toFixed(2),
      bandeira: chargeData?.payment_method?.card?.brand || "",
      finalCartao: chargeData?.payment_method?.card?.last_four_digits || "",
      dataTransacao: chargeData?.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
      numeroPedido: shopifyOrder?.name || orderId || "",
      itensPedido: shopifyOrder?.lineItems?.map((item: any) => ({
        descricao: item.title || "Produto",
        valor: item.price,
      })) ||
        orderData?.items?.map((item: any) => ({
          descricao: item.description || "Produto",
          valor: ((item.amount || 0) / 100).toFixed(2),
        })) || [{ descricao: "Pedido", valor: (amount / 100).toFixed(2) }],
      codigoConfirmacao: chargeId,
      nomeCliente: orderData?.customer?.name || chargeData?.customer?.name || "",
      cpfCliente: orderData?.customer?.documentNumber || "",
      emailCliente: orderData?.customer?.email || chargeData?.customer?.email || "",
      enderecoEntrega: shopifyOrder?.customer?.defaultAddress
        ? [shopifyOrder.customer.defaultAddress.address1, shopifyOrder.customer.defaultAddress.city, shopifyOrder.customer.defaultAddress.zip]
            .filter(Boolean)
            .join(", ")
        : fmtEndereco(orderData?.shippingAddress),
      enderecoFaturamento: fmtEndereco(orderData?.billingAddress),
      ipComprador: "",
      transportadora: shopifyOrder?.fulfillments?.[0]?.trackingInfo?.company || "",
      codigoRastreio:
        shopifyOrder?.fulfillments?.[0]?.trackingInfo?.number ||
        chargeData?.metadata?.tracking_code ||
        "",
      eventosRastreio: [],
      comunicacoes: [],
      nomeEmpresa: "",
      cnpjEmpresa: "",
      emailEmpresa: "",
      telefoneEmpresa: "",
      enderecoEmpresa: "",
      politicaReembolsoUrl: "",
    };

    const record = {
      id: rascunho.contestacaoId,
      chargeId,
      orderId,
      amount: amount / 100,
      reason,
      customerName: rascunho.nomeCliente,
      customerEmail: rascunho.emailCliente,
      createdAt: new Date().toISOString(),
      status: "opened",
      rascunho,
      // Dados enriquecidos da Shopify
      ...(shopifyOrder && {
        shopifyOrderName: shopifyOrder.name,
        shopifyFulfillmentStatus: shopifyOrder.fulfillmentStatus,
        shopifyTrackingNumber: shopifyOrder.fulfillments?.[0]?.trackingInfo?.number,
        shopifyTrackingCompany: shopifyOrder.fulfillments?.[0]?.trackingInfo?.company,
        shopifyTrackingUrl: shopifyOrder.fulfillments?.[0]?.trackingInfo?.url,
      }),
    };

    // Persiste no Blob Store
    const existing = await readStore();
    const updated = [
      record,
      ...existing.filter((c: any) => c.id !== record.id),
    ].slice(0, 200);
    await writeStore(updated);

    console.log(`✅ Chargeback ${record.id} — R$ ${rascunho.valorTransacao} — ${rascunho.nomeCliente}`);

    return Response.json({
      received: true,
      chargebackId: record.id,
      message: `Chargeback de R$ ${rascunho.valorTransacao} salvo`,
    });
  } catch (error) {
    console.error("Erro no webhook:", error);
    // Sempre 200 → evita loop de reenvio do Pagar.me
    return Response.json({ received: true, error: "Logged internally" });
  }
}

// ─── GET /api/pagarme/chargebacks ────────────────────────────────────────────
// Retorna todos os chargebacks armazenados (para o Dashboard).

export async function GET() {
  const chargebacks = await readStore();
  return Response.json(chargebacks);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function inferirTipo(reason: string): FormContestacao["tipoContestacao"] {
  const l = (reason || "").toLowerCase();
  if (l.includes("não recebido") || l.includes("not received")) return "produto_nao_recebido";
  if (l.includes("fraude") || l.includes("fraud") || l.includes("unauthorized")) return "fraude";
  if (l.includes("crédito") || l.includes("credit") || l.includes("reembolso")) return "credito_nao_processado";
  return "desacordo_comercial";
}

function fmtEndereco(e: any): string {
  if (!e) return "";
  return [e.line1, e.line2, e.zipCode, e.city, e.state].filter(Boolean).join(", ");
}
