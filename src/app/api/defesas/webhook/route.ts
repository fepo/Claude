"use server";

import crypto from "crypto";

interface N8nWebhookPayload {
  type: "defesa_gerada" | "defesa_erro" | "chargeback_atualizado";
  chargebackId: string;
  defesaId?: string;
  payload: {
    tipo?: string;
    viabilidade?: number;
    parecer?: string;
    argumentos?: string[];
    recomendacao?: string;
    error?: string;
    errorStack?: string;
    status?: string;
    result?: string;
  };
  timestamp: string;
  signature?: string;
}

/**
 * POST /api/defesas/webhook
 *
 * Webhook para n8n enviar notificações sobre status de defesas
 * - Valida assinatura (opcional, para segurança)
 * - Registra evento em log
 * - Notifica dashboard em tempo real (via WebSocket futuramente)
 * - Dispara notificações por email/Slack (optional)
 *
 * Usado por: n8n workflow após gerar defesa ou erro
 */
export async function POST(request: Request) {
  try {
    const bodyText = await request.text();
    const payload: N8nWebhookPayload = JSON.parse(bodyText);

    // Valida assinatura se configurada
    const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
    if (webhookSecret && payload.signature) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(bodyText)
        .digest("hex");

      if (payload.signature !== expectedSignature) {
        console.warn("Assinatura de webhook n8n inválida");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 401 }
        );
      }
    }

    // Processa conforme tipo de evento
    switch (payload.type) {
      case "defesa_gerada":
        console.log(
          `✓ Defesa gerada para chargeback ${payload.chargebackId}`,
          {
            defesaId: payload.defesaId,
            tipo: payload.payload.tipo,
            viabilidade: payload.payload.viabilidade,
            recomendacao: payload.payload.recomendacao,
          }
        );
        // TODO: Notificar usuário que defesa está pronta
        // await notificarUsuario(payload.chargebackId, "Sua defesa foi gerada! Revise e aprove para enviar.");
        break;

      case "defesa_erro":
        console.error(
          `✗ Erro ao gerar defesa para chargeback ${payload.chargebackId}`,
          {
            error: payload.payload.error,
            errorStack: payload.payload.errorStack,
          }
        );
        // TODO: Notificar admin sobre erro
        // await notificarAdmin(`Erro ao gerar defesa: ${payload.payload.error}`);
        break;

      case "chargeback_atualizado":
        console.log(
          `ℹ Chargeback ${payload.chargebackId} atualizado`,
          {
            status: payload.payload.status,
            resultado: payload.payload.result,
          }
        );
        // TODO: Atualizar status local
        // await atualizarStatusChargeback(payload.chargebackId, payload.payload.status);
        break;

      default:
        console.warn(`Tipo de evento desconhecido: ${payload.type}`);
    }

    return Response.json({
      received: true,
      type: payload.type,
      chargebackId: payload.chargebackId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erro no webhook n8n:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    );
  }
}
