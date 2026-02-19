import { getShopifyAPI } from "@/lib/shopify";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderName = searchParams.get("orderName");

    if (!orderName) {
      return Response.json(
        { success: false, error: "orderName parameter is required" },
        { status: 400 }
      );
    }

    const shopifyAPI = getShopifyAPI();

    if (!shopifyAPI) {
      return Response.json(
        {
          success: false,
          error: "Shopify não está configurado. Configure SHOPIFY_STORE_URL e SHOPIFY_API_ACCESS_TOKEN.",
          order: null,
        },
        { status: 200 }
      );
    }

    const order = await shopifyAPI.getOrderByName(orderName);

    if (!order) {
      return Response.json(
        {
          success: false,
          error: `Pedido #${orderName} não encontrado na Shopify`,
          order: null,
        },
        { status: 200 }
      );
    }

    return Response.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Erro ao buscar pedido Shopify:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido ao buscar pedido",
        order: null,
      },
      { status: 500 }
    );
  }
}
