/**
 * Shopify API Client
 * Para buscar pedidos e dados de fulfillment
 */

export interface ShopifyCustomer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  defaultAddress?: {
    address1: string;
    address2?: string;
    city: string;
    province: string;
    country: string;
    zip: string;
  };
}

export interface ShopifyLineItem {
  id: string;
  title: string;
  quantity: number;
  price: string;
  sku: string | null;
  variantId: string | null;
}

export interface ShopifyFulfillment {
  id: string;
  status: "pending" | "open" | "in_transit" | "delivered" | "failure" | "confirmed" | "cancelled" | "error";
  createdAt: string;
  updatedAt: string;
  trackingInfo?: {
    number: string | null;
    company: string | null;
    url: string | null;
  };
  fulfillmentLineItems: Array<{
    id: string;
    quantity: number;
    lineItemId: string;
  }>;
}

export interface ShopifyOrder {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  customer?: ShopifyCustomer;
  lineItems: ShopifyLineItem[];
  fulfillments: ShopifyFulfillment[];
  totalPrice: string;
  subtotalPrice: string;
  taxPrice: string;
  shippingPrice: string;
  currency: string;
  financialStatus: "authorized" | "pending" | "paid" | "partially_paid" | "refunded" | "voided" | "partially_refunded" | "any" | "authorized" | "pending";
  fulfillmentStatus: "fulfilled" | "partial" | "restocked" | "pending" | "scheduled" | "on_demand" | null;
  tags: string[];
}

export class ShopifyAPI {
  private apiUrl: string;
  private accessToken: string;

  constructor(storeUrl: string, accessToken: string, apiVersion: string = "2024-10") {
    if (!storeUrl || !accessToken) {
      throw new Error("Shopify store URL and access token are required");
    }

    // Remove protocol and trailing slash
    const cleanUrl = storeUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
    this.apiUrl = `https://${cleanUrl}/admin/api/${apiVersion}`;
    this.accessToken = accessToken;
  }

  /**
   * Realiza requisição GraphQL à API Shopify
   */
  private async request<T>(query: string, variables?: Record<string, any>): Promise<T> {
    const url = `${this.apiUrl}/graphql.json`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": this.accessToken,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Shopify API error: ${response.status} ${text}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`Shopify GraphQL error: ${JSON.stringify(data.errors)}`);
    }

    return data.data as T;
  }

  /**
   * Busca um pedido pelo nome (ex: "#1001" ou "1001")
   */
  async getOrderByName(orderName: string): Promise<ShopifyOrder | null> {
    try {
      const cleanName = orderName.replace(/^#/, "");

      const query = `
        query SearchOrders($query: String!) {
          orders(first: 1, query: $query) {
            edges {
              node {
                id
                name
                email
                createdAt
                updatedAt
                customer {
                  id
                  email
                  firstName
                  lastName
                  phone
                  defaultAddress {
                    address1
                    address2
                    city
                    province
                    country
                    zip
                  }
                }
                lineItems(first: 100) {
                  edges {
                    node {
                      id
                      title
                      quantity
                      price {
                        amount
                      }
                      sku
                      variantId
                    }
                  }
                }
                fulfillments(first: 100) {
                  edges {
                    node {
                      id
                      status
                      createdAt
                      updatedAt
                      trackingInfo {
                        number
                        company
                        url
                      }
                      fulfillmentLineItems(first: 100) {
                        edges {
                          node {
                            id
                            quantity
                            lineItem {
                              id
                            }
                          }
                        }
                      }
                    }
                  }
                }
                totalPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
                subtotalPriceSet {
                  shopMoney {
                    amount
                  }
                }
                taxPriceSet {
                  shopMoney {
                    amount
                  }
                }
                shippingPriceSet {
                  shopMoney {
                    amount
                  }
                }
                financialStatus
                fulfillmentStatus
                tags
              }
            }
          }
        }
      `;

      const result = await this.request<{
        orders: {
          edges: Array<{
            node: any;
          }>;
        };
      }>(query, { query: `name:${cleanName}` });

      if (!result.orders.edges.length) {
        return null;
      }

      const node = result.orders.edges[0].node;
      return this.mapOrderResponse(node);
    } catch (error) {
      console.error(`Erro ao buscar order ${orderName}:`, error);
      return null;
    }
  }

  /**
   * Mapeia resposta GraphQL para interface ShopifyOrder
   */
  private mapOrderResponse(node: any): ShopifyOrder {
    return {
      id: node.id,
      name: node.name,
      email: node.email,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
      customer: node.customer
        ? {
            id: node.customer.id,
            email: node.customer.email,
            firstName: node.customer.firstName,
            lastName: node.customer.lastName,
            phone: node.customer.phone,
            defaultAddress: node.customer.defaultAddress || undefined,
          }
        : undefined,
      lineItems: (node.lineItems?.edges || []).map((edge: any) => ({
        id: edge.node.id,
        title: edge.node.title,
        quantity: edge.node.quantity,
        price: edge.node.price?.amount || "0",
        sku: edge.node.sku,
        variantId: edge.node.variantId,
      })),
      fulfillments: (node.fulfillments?.edges || []).map((edge: any) => ({
        id: edge.node.id,
        status: edge.node.status,
        createdAt: edge.node.createdAt,
        updatedAt: edge.node.updatedAt,
        trackingInfo: edge.node.trackingInfo || undefined,
        fulfillmentLineItems: (edge.node.fulfillmentLineItems?.edges || []).map((fli: any) => ({
          id: fli.node.id,
          quantity: fli.node.quantity,
          lineItemId: fli.node.lineItem?.id,
        })),
      })),
      totalPrice: node.totalPriceSet?.shopMoney?.amount || "0",
      subtotalPrice: node.subtotalPriceSet?.shopMoney?.amount || "0",
      taxPrice: node.taxPriceSet?.shopMoney?.amount || "0",
      shippingPrice: node.shippingPriceSet?.shopMoney?.amount || "0",
      currency: node.totalPriceSet?.shopMoney?.currencyCode || "BRL",
      financialStatus: node.financialStatus,
      fulfillmentStatus: node.fulfillmentStatus,
      tags: node.tags || [],
    };
  }
}

/**
 * Cria instância de API client com variáveis de ambiente
 */
export function getShopifyAPI(): ShopifyAPI | null {
  const storeUrl = process.env.SHOPIFY_STORE_URL;
  const accessToken = process.env.SHOPIFY_API_ACCESS_TOKEN;
  const apiVersion = process.env.SHOPIFY_API_VERSION || "2024-10";

  if (!storeUrl || !accessToken) {
    return null;
  }

  return new ShopifyAPI(storeUrl, accessToken, apiVersion);
}
