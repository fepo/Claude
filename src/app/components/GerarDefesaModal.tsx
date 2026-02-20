"use client";

import { useState, useEffect } from "react";
import type { FormContestacao } from "@/types";

interface ChargebackItem {
  id: string;
  chargeId?: string;
  status: string;
  amount: number;
  reason: string;
  createdAt: string;
  orderId?: string | null;
  customerName: string;
  customerEmail: string;
  rascunho?: FormContestacao;
}

interface GerarDefesaModalProps {
  chargeback: ChargebackItem;
  onClose: () => void;
  onSuccess: (enrichedChargeback: ChargebackItem & { _enrichedFormData?: FormContestacao }) => void;
}

export default function GerarDefesaModal({
  chargeback,
  onClose,
  onSuccess,
}: GerarDefesaModalProps) {
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<
    Array<{ name: string; status: "pending" | "loading" | "success" | "error"; message?: string }>
  >([
    { name: "Pagar.me", status: "success", message: "Dados carregados" },
    { name: "Shopify", status: "loading", message: "Buscando pedido..." },
    { name: "Correios / Transportadora", status: "pending", message: "Aguardando..." },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [shopifyOrder, setShopifyOrder] = useState<string | null>(null);
  const [trackingCount, setTrackingCount] = useState(0);
  const [formData, setFormData] = useState<FormContestacao | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/gerar-defesa", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chargebackId: chargeback.id,
            chargeId: chargeback.chargeId,
            orderId: chargeback.orderId || chargeback.rascunho?.numeroPedido,
            customerName: chargeback.customerName,
            customerEmail: chargeback.customerEmail,
            amount: chargeback.amount,
            reason: chargeback.reason,
            rascunho: chargeback.rascunho,
          }),
        });

        const data = await res.json();

        if (data.success) {
          setSteps(data.steps);
          setShopifyOrder(data.shopifyOrder?.name || null);
          setTrackingCount(data.trackingCount);
          setFormData(data.formData);
        } else {
          setError(data.error || "Erro ao gerar defesa");
          setSteps((prev) =>
            prev.map((s) => ({
              ...s,
              status: s.status === "loading" ? "error" : s.status,
            }))
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido");
        setSteps((prev) =>
          prev.map((s) => ({
            ...s,
            status: s.status === "loading" ? "error" : s.status,
          }))
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [chargeback]);

  const handleProsseguir = () => {
    if (formData) {
      onSuccess({
        ...chargeback,
        _enrichedFormData: formData,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">Gerando Defesa...</h2>
            <p className="text-sm text-gray-500 mt-1">
              Integrando dados do Pagar.me com Shopify
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3 mb-6">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {step.status === "success" && (
                    <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">
                      ✓
                    </div>
                  )}
                  {step.status === "loading" && (
                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-blue-600 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                    </div>
                  )}
                  {step.status === "error" && (
                    <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">
                      ✕
                    </div>
                  )}
                  {step.status === "pending" && (
                    <div className="w-5 h-5 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
                      ○
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{step.name}</p>
                  <p className="text-xs text-gray-500">{step.message}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Results Summary */}
          {!loading && !error && (
            <div className="mb-6 space-y-2 p-3 bg-gray-50 rounded-lg">
              <div className="text-xs">
                <p className="text-gray-600">
                  <span className="font-medium">Chargeback:</span> {chargeback.id.slice(0, 12)}...
                </p>
                {shopifyOrder && (
                  <p className="text-gray-600 mt-1">
                    <span className="font-medium">Pedido Shopify:</span> {shopifyOrder}
                  </p>
                )}
                {trackingCount > 0 && (
                  <p className="text-gray-600 mt-1">
                    <span className="font-medium">Rastreamento:</span> {trackingCount} eventos
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium text-sm transition-colors"
            >
              Cancelar
            </button>
            {!loading && !error && (
              <button
                onClick={handleProsseguir}
                disabled={!formData}
                className="flex-1 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
              >
                Prosseguir
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
