"use server";

import type { FormContestacao } from "@/types";
import { salvarRascunho } from "@/lib/storage";

interface SalvarDefesaRequest {
  contestacaoId: string;
  chargebackId: string;
  dossie: string;
  dossieTitulo: string;
  dossieMD: string; // Markdown do dossiê gerado
  contestacao: FormContestacao;
  parecer?: {
    tipo: "produto_nao_recebido" | "fraude" | "desacordo_comercial" | "credito_nao_processado";
    viabilidade: number; // 0.0 - 1.0
    parecer: string;
    argumentos: string[];
    recomendacao: "responder" | "nao_responder" | "acompanhar";
    confianca: number;
  };
  shopifyData?: {
    orderId: string;
    fulfillmentStatus: string;
    financialStatus: string;
    trackingInfo?: {
      number: string;
      company: string;
      url?: string;
    };
  };
  source: "n8n" | "manual"; // De onde veio (n8n workflow ou manual do dashboard)
}

/**
 * POST /api/defesas/salvar
 *
 * Salva uma defesa gerada (por n8n ou manual)
 * - Valida dados
 * - Salva como rascunho no localStorage
 * - Retorna ID da defesa para rastreamento
 *
 * Usado por: n8n workflow após gerar dossiê
 */
export async function POST(request: Request) {
  try {
    const body: SalvarDefesaRequest = await request.json();

    // Valida campos obrigatórios
    if (
      !body.contestacaoId ||
      !body.chargebackId ||
      !body.dossie ||
      !body.contestacao
    ) {
      return Response.json(
        {
          error: "Campos obrigatórios faltando: contestacaoId, chargebackId, dossie, contestacao",
        },
        { status: 400 }
      );
    }

    // Monta objeto de defesa completo
    const defesaCompleta: FormContestacao & {
      _defesaMeta: {
        chargebackId: string;
        dossieTitulo: string;
        dossieMD: string;
        parecer?: SalvarDefesaRequest["parecer"];
        shopifyData?: SalvarDefesaRequest["shopifyData"];
        source: "n8n" | "manual";
        status: "drafted" | "submitted" | "won" | "lost";
        geradoEm: string;
        aprovarEm?: string;
      };
    } = {
      ...body.contestacao,
      _defesaMeta: {
        chargebackId: body.chargebackId,
        dossieTitulo: body.dossieTitulo,
        dossieMD: body.dossieMD,
        parecer: body.parecer,
        shopifyData: body.shopifyData,
        source: body.source,
        status: "drafted",
        geradoEm: new Date().toISOString(),
      },
    };

    // Salva como rascunho
    const defesaSalva = salvarRascunho(defesaCompleta, true); // isDefesa = true

    console.log(
      `[${body.source}] Defesa ${body.contestacaoId} salva como rascunho`,
      defesaSalva
    );

    return Response.json({
      success: true,
      defesaId: defesaSalva.id,
      contestacaoId: body.contestacaoId,
      chargebackId: body.chargebackId,
      status: "drafted",
      message: `Defesa salva como rascunho. Aguardando aprovação do usuário.`,
      dashboardUrl: `/defesa/${defesaSalva.id}`,
    });
  } catch (error) {
    console.error("Erro ao salvar defesa:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro ao salvar defesa",
      },
      { status: 500 }
    );
  }
}
