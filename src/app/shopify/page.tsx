"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ShopifyOrder } from "@/lib/shopify";

export default function ShopifyDashboard() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [order, setOrder] = useState<ShopifyOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;

    setLoading(true);
    setError("");
    setOrder(null);

    try {
      const res = await fetch(
        `/api/shopify/get-order?orderName=${encodeURIComponent(searchInput)}`
      );
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Pedido não encontrado");
        return;
      }

      setOrder(data.order);
    } catch (err) {
      setError("Erro ao buscar pedido na Shopify");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUseInForm = () => {
    if (!order) return;
    localStorage.setItem("shopify_prefill", JSON.stringify(order));
    router.push("/");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🛒 Explorador de Pedidos Shopify
        </h1>
        <p className="text-gray-600">
          Busque pedidos por número e visualize todos os dados disponíveis
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          placeholder="Digite o número do pedido (ex: #15124 ou 15124)"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* No Order Yet */}
      {!order && !error && (
        <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500">
            Busque um pedido para visualizar todos os dados da Shopify
          </p>
        </div>
      )}

      {/* Order Data */}
      {order && (
        <div className="space-y-6">
          {/* Resumo do Pedido */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📋 Resumo do Pedido</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Nome</p>
                <p className="text-gray-900 font-medium">{order.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">ID</p>
                <p className="text-gray-900 font-mono text-sm break-all">{order.id}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Data Criação</p>
                <p className="text-gray-900">
                  {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Status Financeiro</p>
                <p className="text-gray-900">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                    {order.financialStatus}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Status Fulfillment</p>
                <p className="text-gray-900">
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                    {order.fulfillmentStatus || "—"}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Moeda</p>
                <p className="text-gray-900 font-medium">{order.currency}</p>
              </div>
            </div>
          </div>

          {/* Cliente */}
          {order.customer && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">👤 Cliente</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Nome</p>
                  <p className="text-gray-900 font-medium">
                    {order.customer.firstName} {order.customer.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Email</p>
                  <p className="text-gray-900 break-all">{order.customer.email}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Telefone</p>
                  <p className="text-gray-900">{order.customer.phone || "—"}</p>
                </div>
                {order.customer.defaultAddress && (
                  <>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Endereço</p>
                      <p className="text-gray-900">{order.customer.defaultAddress.address1}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Complemento</p>
                      <p className="text-gray-900">{order.customer.defaultAddress.address2 || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Cidade</p>
                      <p className="text-gray-900">{order.customer.defaultAddress.city}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Estado</p>
                      <p className="text-gray-900">{order.customer.defaultAddress.province}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">CEP</p>
                      <p className="text-gray-900">{order.customer.defaultAddress.zip}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">País</p>
                      <p className="text-gray-900">{order.customer.defaultAddress.country}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Itens do Pedido */}
          {order.lineItems && order.lineItems.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📦 Itens do Pedido</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Produto</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">SKU</th>
                      <th className="text-center py-2 px-3 font-semibold text-gray-700">Qtd</th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">Preço</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.lineItems.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="py-2 px-3">{item.title}</td>
                        <td className="py-2 px-3 font-mono text-xs text-gray-500">
                          {item.sku || "—"}
                        </td>
                        <td className="py-2 px-3 text-center">{item.quantity}</td>
                        <td className="py-2 px-3 text-right font-medium">R$ {item.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Fulfillments / Entrega */}
          {order.fulfillments && order.fulfillments.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🚚 Fulfillment / Entrega</h2>
              <div className="space-y-4">
                {order.fulfillments.map((fulfillment, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-100 rounded-lg p-4 bg-gray-50"
                  >
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Status</p>
                        <p className="text-gray-900">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                            {fulfillment.status}
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">
                          Data Criação
                        </p>
                        <p className="text-gray-900 text-sm">
                          {new Date(fulfillment.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">
                          Data Atualização
                        </p>
                        <p className="text-gray-900 text-sm">
                          {new Date(fulfillment.updatedAt).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      {fulfillment.trackingInfo && (
                        <>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">
                              Código Rastreio
                            </p>
                            <p className="text-gray-900 font-mono">
                              {fulfillment.trackingInfo.number || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">
                              Transportadora
                            </p>
                            <p className="text-gray-900">
                              {fulfillment.trackingInfo.company || "—"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase">
                              Link Rastreio
                            </p>
                            {fulfillment.trackingInfo.url ? (
                              <a
                                href={fulfillment.trackingInfo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm break-all"
                              >
                                Rastrear
                              </a>
                            ) : (
                              <p className="text-gray-500">—</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Valores */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">💰 Valores</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="border-r border-gray-200 pr-4">
                <p className="text-xs font-semibold text-gray-500 uppercase">Subtotal</p>
                <p className="text-lg font-bold text-gray-900">R$ {order.subtotalPrice}</p>
              </div>
              <div className="border-r border-gray-200 pr-4">
                <p className="text-xs font-semibold text-gray-500 uppercase">Impostos</p>
                <p className="text-lg font-bold text-gray-900">R$ {order.taxPrice}</p>
              </div>
              <div className="border-r border-gray-200 pr-4">
                <p className="text-xs font-semibold text-gray-500 uppercase">Frete</p>
                <p className="text-lg font-bold text-gray-900">R$ {order.shippingPrice}</p>
              </div>
              <div className="col-span-2 md:col-span-1 bg-brand-50 border border-brand-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-brand-700 uppercase">Total</p>
                <p className="text-2xl font-bold text-brand-600">R$ {order.totalPrice}</p>
              </div>
            </div>
          </div>

          {/* Field Mapping Table */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🔗 Mapeamento de Campos</h2>
            <p className="text-sm text-gray-600 mb-4">
              Veja quais campos Shopify estão mapeados para o formulário:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-3 px-3 font-semibold text-gray-700">Campo Shopify</th>
                    <th className="text-left py-3 px-3 font-semibold text-gray-700">Campo do Formulário</th>
                    <th className="text-center py-3 px-3 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 font-mono text-xs">lineItems[].title</td>
                    <td className="py-3 px-3">itensPedido[].descricao</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-semibold">
                        ✅ Mapeado
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 font-mono text-xs">lineItems[].price</td>
                    <td className="py-3 px-3">itensPedido[].valor</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-semibold">
                        ✅ Mapeado
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 font-mono text-xs">
                      fulfillments[].trackingInfo.company
                    </td>
                    <td className="py-3 px-3">transportadora</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-semibold">
                        ✅ Mapeado
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 font-mono text-xs">
                      fulfillments[].trackingInfo.number
                    </td>
                    <td className="py-3 px-3">codigoRastreio</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-semibold">
                        ✅ Mapeado
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 font-mono text-xs">
                      customer.defaultAddress.*
                    </td>
                    <td className="py-3 px-3">enderecoEntrega</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-semibold">
                        ✅ Mapeado
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 font-mono text-xs">customer.firstName + lastName</td>
                    <td className="py-3 px-3">nomeCliente</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-semibold">
                        ✅ Mapeado
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 font-mono text-xs">customer.email</td>
                    <td className="py-3 px-3">emailCliente</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-semibold">
                        ✅ Mapeado
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 font-mono text-xs">totalPrice</td>
                    <td className="py-3 px-3">valorTransacao</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-semibold">
                        ✅ Mapeado
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 font-mono text-xs">customer.phone</td>
                    <td className="py-3 px-3">—</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        ❌ Não mapeado
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 font-mono text-xs">
                      fulfillments[].trackingInfo.url
                    </td>
                    <td className="py-3 px-3">—</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        ❌ Não mapeado
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 font-mono text-xs">financialStatus</td>
                    <td className="py-3 px-3">—</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        ❌ Não mapeado
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 font-mono text-xs">fulfillmentStatus</td>
                    <td className="py-3 px-3">—</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        ❌ Não mapeado
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-3 font-mono text-xs">tags</td>
                    <td className="py-3 px-3">—</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        ❌ Não mapeado
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleUseInForm}
            className="w-full px-6 py-3 bg-brand-600 text-white font-bold rounded-lg hover:bg-brand-700 text-lg"
          >
            ✅ Usar no Formulário
          </button>
        </div>
      )}
    </div>
  );
}
