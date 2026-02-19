"use client";

interface ApprovalModalProps {
  isOpen: boolean;
  defesaId: string;
  chargebackId: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

export function ApprovalModal({
  isOpen,
  defesaId,
  chargebackId,
  onConfirm,
  onCancel,
  isLoading,
}: ApprovalModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full space-y-6">
        {/* Header */}
        <div className="pt-6 px-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mx-auto mb-4">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 text-center">
            Confirmar Envio da Defesa
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 space-y-4">
          <p className="text-gray-700">
            Você está prestes a enviar esta defesa para Pagar.me. Após envio, você não poderá
            modificá-la. Tenha certeza de que os dados estão corretos.
          </p>

          {/* Checklist */}
          <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
            <p className="font-semibold text-gray-900 text-sm">Verifique antes de enviar:</p>
            <ul className="space-y-2">
              <li className="flex gap-3 text-sm text-gray-700">
                <span className="text-green-500 flex-shrink-0">✓</span>
                <span>Dossiê completo e correto</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-700">
                <span className="text-green-500 flex-shrink-0">✓</span>
                <span>Incluiu todas as evidências</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-700">
                <span className="text-green-500 flex-shrink-0">✓</span>
                <span>Base legal (CDC Art. 49, BCB 150)</span>
              </li>
              <li className="flex gap-3 text-sm text-gray-700">
                <span className="text-green-500 flex-shrink-0">✓</span>
                <span>Parecer jurídico analisado</span>
              </li>
            </ul>
          </div>

          {/* Dados Importantes */}
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <p className="text-sm font-semibold text-yellow-900 mb-2">⚠️ Atenção</p>
            <p className="text-sm text-yellow-800">
              Verifique se a viabilidade indicada (%) justifica o envio da defesa para a Pagar.me.
              Chargebacks com baixa viabilidade podem não ter sucesso.
            </p>
          </div>

          {/* IDs para referência */}
          <div className="bg-gray-100 p-3 rounded-lg space-y-1 text-xs font-mono text-gray-600">
            <p>
              Defesa: <span className="text-gray-800">{defesaId}</span>
            </p>
            <p>
              Chargeback: <span className="text-gray-800">{chargebackId}</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin w-4 h-4"
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
                Enviando...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                </svg>
                Confirmar Envio
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
