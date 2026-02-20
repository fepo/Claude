"use client";

import type { FormContestacao, TipoContestacao } from "@/types";

interface VerificarDadosModalProps {
  form: FormContestacao;
  onConfirm: () => void;
  onBack: () => void;
}

interface RequirementField {
  key: keyof FormContestacao;
  label: string;
  source: string;
  level: "obrigatorio" | "recomendado" | "opcional";
}

const REQUIREMENTS: Record<TipoContestacao, RequirementField[]> = {
  desacordo_comercial: [
    { key: "contestacaoId", label: "ID da Contestação", source: "Pagar.me", level: "obrigatorio" },
    { key: "nomeCliente", label: "Nome do cliente", source: "Shopify / Manual", level: "obrigatorio" },
    { key: "emailCliente", label: "Email do cliente", source: "Pagar.me", level: "obrigatorio" },
    { key: "valorTransacao", label: "Valor da transação", source: "Pagar.me", level: "obrigatorio" },
    { key: "itensPedido", label: "Itens do pedido", source: "Shopify", level: "obrigatorio" },
    { key: "comunicacoes", label: "Comunicações com cliente", source: "Manual", level: "obrigatorio" },
    { key: "codigoConfirmacao", label: "Código de confirmação", source: "Manual", level: "recomendado" },
    { key: "politicaReembolsoUrl", label: "Política de reembolso", source: "Manual", level: "recomendado" },
    { key: "enderecoEntrega", label: "Endereço de entrega", source: "Shopify", level: "recomendado" },
  ],
  produto_nao_recebido: [
    { key: "contestacaoId", label: "ID da Contestação", source: "Pagar.me", level: "obrigatorio" },
    { key: "nomeCliente", label: "Nome do cliente", source: "Shopify / Manual", level: "obrigatorio" },
    { key: "emailCliente", label: "Email do cliente", source: "Pagar.me", level: "obrigatorio" },
    { key: "valorTransacao", label: "Valor da transação", source: "Pagar.me", level: "obrigatorio" },
    { key: "codigoRastreio", label: "Código de rastreio", source: "Shopify", level: "obrigatorio" },
    { key: "eventosRastreio", label: "Eventos de rastreamento", source: "LinkeTrack", level: "obrigatorio" },
    { key: "transportadora", label: "Transportadora", source: "Shopify", level: "recomendado" },
    { key: "enderecoEntrega", label: "Endereço de entrega", source: "Shopify", level: "recomendado" },
    { key: "itensPedido", label: "Itens do pedido", source: "Shopify", level: "recomendado" },
  ],
  fraude: [
    { key: "contestacaoId", label: "ID da Contestação", source: "Pagar.me", level: "obrigatorio" },
    { key: "nomeCliente", label: "Nome do cliente", source: "Shopify / Manual", level: "obrigatorio" },
    { key: "emailCliente", label: "Email do cliente", source: "Pagar.me", level: "obrigatorio" },
    { key: "valorTransacao", label: "Valor da transação", source: "Pagar.me", level: "obrigatorio" },
    { key: "cpfCliente", label: "CPF do cliente", source: "Manual", level: "obrigatorio" },
    { key: "ipComprador", label: "IP do comprador", source: "Manual", level: "obrigatorio" },
    { key: "bandeira", label: "Bandeira do cartão", source: "Pagar.me", level: "obrigatorio" },
    { key: "enderecoEntrega", label: "Endereço de entrega", source: "Shopify", level: "recomendado" },
    { key: "enderecoFaturamento", label: "Endereço de faturamento", source: "Manual", level: "recomendado" },
    { key: "itensPedido", label: "Itens do pedido", source: "Shopify", level: "recomendado" },
  ],
  credito_nao_processado: [
    { key: "contestacaoId", label: "ID da Contestação", source: "Pagar.me", level: "obrigatorio" },
    { key: "nomeCliente", label: "Nome do cliente", source: "Shopify / Manual", level: "obrigatorio" },
    { key: "emailCliente", label: "Email do cliente", source: "Pagar.me", level: "obrigatorio" },
    { key: "valorTransacao", label: "Valor da transação", source: "Pagar.me", level: "obrigatorio" },
    { key: "codigoConfirmacao", label: "Código de confirmação", source: "Manual", level: "obrigatorio" },
    { key: "itensPedido", label: "Itens do pedido", source: "Shopify", level: "recomendado" },
    { key: "comunicacoes", label: "Comunicações com cliente", source: "Manual", level: "recomendado" },
  ],
};

const TIPO_LABELS: Record<TipoContestacao, string> = {
  desacordo_comercial: "Desacordo Comercial",
  produto_nao_recebido: "Produto Não Recebido",
  fraude: "Fraude",
  credito_nao_processado: "Crédito Não Processado",
};

function isFieldEmpty(form: FormContestacao, key: keyof FormContestacao): boolean {
  const value = form[key];

  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (Array.isArray(value) && value.length === 1 && typeof value[0] === "object") {
    const item = value[0] as Record<string, any>;
    return Object.values(item).every((v) => !v || (typeof v === "string" && !v.trim()));
  }

  return false;
}

export default function VerificarDadosModal({
  form,
  onConfirm,
  onBack,
}: VerificarDadosModalProps) {
  const requirements = REQUIREMENTS[form.tipoContestacao];
  const tipoLabel = TIPO_LABELS[form.tipoContestacao];

  const obrigatorios = requirements.filter((r) => r.level === "obrigatorio");
  const recomendados = requirements.filter((r) => r.level === "recomendado");

  const obrigatoriosPreenchidos = obrigatorios.filter((r) => !isFieldEmpty(form, r.key)).length;
  const obrigatoriofaltando = obrigatorios.length - obrigatoriosPreenchidos;

  const recomendadosPreenchidos = recomendados.filter((r) => !isFieldEmpty(form, r.key)).length;

  const temFaltando = obrigatoriofaltando > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full shadow-xl max-h-96 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">Verificar dados</h2>
            <p className="text-sm text-gray-600 mt-1">{tipoLabel}</p>
          </div>

          {/* Obrigatórios */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-gray-800">OBRIGATÓRIOS</h3>
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                {obrigatoriosPreenchidos}/{obrigatorios.length}
              </span>
            </div>
            <div className="space-y-2">
              {obrigatorios.map((req) => {
                const isEmpty = isFieldEmpty(form, req.key);
                return (
                  <div key={String(req.key)} className="flex items-start gap-3 p-2 rounded hover:bg-gray-50">
                    <div className="flex-shrink-0 mt-0.5">
                      {!isEmpty ? (
                        <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
                          ✓
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">
                          ✕
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${isEmpty ? "text-red-700 font-medium" : "text-gray-900"}`}>
                        {req.label}
                      </p>
                      <p className="text-xs text-gray-500">{req.source}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recomendados */}
          {recomendados.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-gray-800">RECOMENDADOS</h3>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                  {recomendadosPreenchidos}/{recomendados.length}
                </span>
              </div>
              <div className="space-y-2">
                {recomendados.map((req) => {
                  const isEmpty = isFieldEmpty(form, req.key);
                  return (
                    <div key={String(req.key)} className="flex items-start gap-3 p-2 rounded hover:bg-gray-50">
                      <div className="flex-shrink-0 mt-0.5">
                        {!isEmpty ? (
                          <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                            ✓
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center">
                            ◯
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${isEmpty ? "text-gray-600" : "text-gray-900"}`}>
                          {req.label}
                        </p>
                        <p className="text-xs text-gray-500">{req.source}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary */}
          {temFaltando && (
            <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ {obrigatoriofaltando} campo(s) obrigatório(s) faltando. Você pode continuar mesmo assim.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex-1 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium text-sm transition-colors"
            >
              ← Voltar ao formulário
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-colors text-white ${
                temFaltando
                  ? "bg-yellow-500 hover:bg-yellow-600"
                  : "bg-brand-500 hover:bg-brand-600"
              }`}
            >
              {temFaltando ? "Gerar mesmo assim" : "Gerar Defesa"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
