import { NextResponse } from "next/server";
import { requireShopify } from "@/lib/session";
import { shopifyGql } from "@/lib/shopify";

type GqlResp = {
  products: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        handle: string;
        status: string;
        vendor: string | null;
        productType: string | null;
        totalInventory: number | null;
        tracksInventory: boolean;
        variants: {
          edges: Array<{
            node: {
              id: string;
              sku: string | null;
              inventoryQuantity: number | null;
            };
          }>;
        };
      };
    }>;
  };
};

export type InventoryItem = {
  id: string;
  handle: string;
  title: string;
  status: string;
  vendor: string | null;
  productType: string | null;
  sku: string | null;
  quantity: number;
  tracksInventory: boolean;
};

export async function GET() {
  let creds: { shopDomain: string; accessToken: string };
  try {
    creds = await requireShopify();
  } catch {
    return NextResponse.json({ error: "Not connected to Shopify" }, { status: 401 });
  }

  const query = `
    query InventoryList($first: Int!) {
      products(first: $first, sortKey: UPDATED_AT, reverse: true) {
        edges {
          node {
            id
            title
            handle
            status
            vendor
            productType
            totalInventory
            tracksInventory
            variants(first: 1) {
              edges { node { id sku inventoryQuantity } }
            }
          }
        }
      }
    }
  `;

  try {
    const data = await shopifyGql<GqlResp>(creds, query, { first: 50 });
    const items: InventoryItem[] = data.products.edges.map(({ node }) => {
      const v = node.variants.edges[0]?.node;
      return {
        id: node.id,
        handle: node.handle,
        title: node.title,
        status: node.status,
        vendor: node.vendor,
        productType: node.productType,
        sku: v?.sku ?? null,
        quantity: node.totalInventory ?? v?.inventoryQuantity ?? 0,
        tracksInventory: node.tracksInventory,
      };
    });
    return NextResponse.json({ items, shopDomain: creds.shopDomain });
  } catch (e) {
    const msg = (e as Error).message;
    if (/access denied.*products/i.test(msg) || /scope/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            "Your Shopify token is missing the read_products scope. In Shopify admin → Settings → Apps and sales channels → Develop apps → your app → Configuration, enable read_products (and read_inventory), then reinstall the app and reconnect with the new token.",
        },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
