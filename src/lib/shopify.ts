const API_VERSION = process.env.SHOPIFY_API_VERSION || "2025-01";

type Creds = { shopDomain: string; accessToken: string };

type GqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
};

export async function shopifyGql<T>(
  creds: Creds,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const url = `https://${creds.shopDomain}/admin/api/${API_VERSION}/graphql.json`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": creds.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });
  } catch (e) {
    const err = e as Error & { cause?: { code?: string; message?: string } };
    const causeMsg = err.cause?.code || err.cause?.message || "";
    throw new Error(
      `Shopify fetch failed${causeMsg ? `: ${causeMsg}` : ""} (${err.message})`,
    );
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify HTTP ${res.status}: ${text.slice(0, 400)}`);
  }
  const body = (await res.json()) as GqlResponse<T>;
  if (body.errors?.length) {
    throw new Error(`Shopify GraphQL: ${body.errors.map((e) => e.message).join("; ")}`);
  }
  if (!body.data) throw new Error("Shopify returned no data");
  return body.data;
}

export async function verifyShop(creds: Creds): Promise<{ name: string; myshopifyDomain: string }> {
  const data = await shopifyGql<{
    shop: { name: string; myshopifyDomain: string };
  }>(creds, `query { shop { name myshopifyDomain } }`);
  return data.shop;
}

// ─── Mutations ──────────────────────────────────────────────

const STAGED_UPLOADS_CREATE = `
mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) {
    stagedTargets { url resourceUrl parameters { name value } }
    userErrors { field message }
  }
}`;

const PRODUCT_CREATE = `
mutation productCreate($input: ProductInput!, $media: [CreateMediaInput!]) {
  productCreate(input: $input, media: $media) {
    product { id handle status title onlineStoreUrl }
    userErrors { field message }
  }
}`;

export type StagedTarget = {
  url: string;
  resourceUrl: string;
  parameters: Array<{ name: string; value: string }>;
};

export async function stageUpload(
  creds: Creds,
  opts: { filename: string; mimeType: string; bytesSize: number },
): Promise<StagedTarget> {
  const data = await shopifyGql<{
    stagedUploadsCreate: { stagedTargets: StagedTarget[]; userErrors: Array<{ message: string }> };
  }>(creds, STAGED_UPLOADS_CREATE, {
    input: [
      {
        filename: opts.filename,
        mimeType: opts.mimeType,
        httpMethod: "POST",
        resource: "IMAGE",
        fileSize: String(opts.bytesSize),
      },
    ],
  });
  const errs = data.stagedUploadsCreate.userErrors;
  if (errs?.length) throw new Error(`stagedUploadsCreate: ${errs.map((e) => e.message).join("; ")}`);
  const t = data.stagedUploadsCreate.stagedTargets[0];
  if (!t) throw new Error("stagedUploadsCreate returned no targets");
  return t;
}

export async function uploadBytesToStaged(
  target: StagedTarget,
  bytes: Uint8Array,
  mimeType: string,
): Promise<string> {
  // Shopify staged uploads use POST multipart with the provided parameters
  // (GCS resumable-upload-style form). Each parameter goes into the form body
  // and the file goes last as "file".
  const form = new FormData();
  for (const p of target.parameters) form.append(p.name, p.value);
  form.append("file", new Blob([new Uint8Array(bytes)], { type: mimeType }));
  let res: Response;
  try {
    res = await fetch(target.url, { method: "POST", body: form });
  } catch (e) {
    const err = e as Error & { cause?: { code?: string; message?: string } };
    const causeMsg = err.cause?.code || err.cause?.message || "";
    throw new Error(
      `Staged upload fetch failed${causeMsg ? `: ${causeMsg}` : ""} (${err.message})`,
    );
  }
  if (!res.ok && res.status !== 201 && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Staged POST failed ${res.status}: ${text.slice(0, 300)}`);
  }
  return target.resourceUrl;
}

export type ProductInput = {
  title: string;
  descriptionHtml: string;
  handle?: string;
  vendor?: string;
  productType?: string;
  tags?: string[];
  status?: "DRAFT" | "ACTIVE";
  seo?: { title?: string; description?: string };
  metafields?: Array<{ namespace: string; key: string; type: string; value: string }>;
};

export type MediaInput = {
  originalSource: string;
  alt?: string;
  mediaContentType: "IMAGE";
};

export async function productCreate(
  creds: Creds,
  input: ProductInput,
  media: MediaInput[],
): Promise<{ id: string; handle: string; title: string; status: string }> {
  const data = await shopifyGql<{
    productCreate: {
      product: { id: string; handle: string; title: string; status: string } | null;
      userErrors: Array<{ field?: string[]; message: string }>;
    };
  }>(creds, PRODUCT_CREATE, { input, media });
  const errs = data.productCreate.userErrors;
  if (errs?.length) throw new Error(`productCreate: ${errs.map((e) => e.message).join("; ")}`);
  if (!data.productCreate.product) throw new Error("productCreate returned null product");
  return data.productCreate.product;
}
