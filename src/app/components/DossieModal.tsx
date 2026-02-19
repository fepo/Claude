"use client";

import { useState } from "react";

interface DossieModalProps {
  isOpen: boolean;
  titulo: string;
  dossie: string;
  temShopify: boolean;
  onClose: () => void;
  onExportPDF: (content: string, filename: string) => void;
  onExportDocx: (content: string, filename: string) => void;
}

export default function DossieModal({
  isOpen,
  titulo,
  dossie,
  temShopify,
  onClose,
  onExportPDF,
  onExportDocx,
}: DossieModalProps) {
  const [copying, setCopying] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(dossie);
      alert("Dossiê copiado para a área de transferência!");
    } catch (err) {
      alert("Erro ao copiar: " + (err instanceof Error ? err.message : "desconhecido"));
    } finally {
      setCopying(false);
    }
  };

  const handleExportPDF = () => {
    const filename = `${titulo.replace(/\s+/g, "_")}.pdf`;
    onExportPDF(dossie, filename);
  };

  const handleExportDocx = () => {
    const filename = `${titulo.replace(/\s+/g, "_")}.docx`;
    onExportDocx(dossie, filename);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{titulo}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {temShopify ? "✓ Inclui dados Shopify" : "⚠️ Dados Shopify não disponíveis"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-sm max-w-none">
            {dossie.split("\n").map((line, idx) => {
              if (line.startsWith("# ")) {
                return (
                  <h1 key={idx} className="text-2xl font-bold mt-6 mb-4 text-gray-900">
                    {line.replace("# ", "")}
                  </h1>
                );
              }
              if (line.startsWith("## ")) {
                return (
                  <h2
                    key={idx}
                    className="text-xl font-bold mt-5 mb-3 text-gray-900"
                  >
                    {line.replace("## ", "")}
                  </h2>
                );
              }
              if (line.startsWith("### ")) {
                return (
                  <h3 key={idx} className="text-lg font-semibold mt-4 mb-2 text-gray-900">
                    {line.replace("### ", "")}
                  </h3>
                );
              }
              if (line.startsWith("**") && line.includes(":")) {
                return (
                  <div key={idx} className="my-1 text-gray-700">
                    {line}
                  </div>
                );
              }
              if (line.startsWith("-")) {
                return (
                  <div key={idx} className="ml-4 my-1 text-gray-700">
                    {line}
                  </div>
                );
              }
              if (line.startsWith("✓") || line.startsWith("⚠️")) {
                const className = line.startsWith("✓")
                  ? "text-green-700 font-medium"
                  : "text-yellow-700 font-medium";
                return (
                  <div key={idx} className={`my-2 ${className}`}>
                    {line}
                  </div>
                );
              }
              if (line === "") {
                return <div key={idx} className="my-2" />;
              }
              return (
                <p key={idx} className="my-1 text-gray-700">
                  {line}
                </p>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleCopy}
              disabled={copying}
              className="btn-secondary text-sm disabled:opacity-50"
            >
              {copying ? "Copiando..." : "📋 Copiar"}
            </button>
            <button
              onClick={handleExportPDF}
              className="btn-secondary text-sm"
            >
              📄 Exportar PDF
            </button>
            <button
              onClick={handleExportDocx}
              className="btn-secondary text-sm"
            >
              📝 Exportar Word
            </button>
          </div>
          <button onClick={onClose} className="btn-primary text-sm">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
