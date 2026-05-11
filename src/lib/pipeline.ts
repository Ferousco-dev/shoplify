import { createHash } from "node:crypto";
import { scrapeBest, type ScrapedProduct } from "@/lib/scrape";
import { loadPrompt, render } from "@/lib/prompts";
import { claudeJson } from "@/lib/claude";
import { rankKeywords, generateSeoRecommendations } from "@/lib/serp";
import { IMAGE_SLOTS, slotByShortKey, type ImageSlot } from "@/lib/slots";
import { fetchReferenceImage, geminiImage } from "@/lib/gemini";
import { stageUpload, uploadBytesToStaged } from "@/lib/shopify";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type ShopifyCreds = { shopDomain: string; accessToken: string };

export type CsvRow = {
  product_name?: string;
  category?: string;
  amazon?: string;
  aliexpress?: string;
  alibaba?: string;
  alibaba1688?: string;
  other?: string;
  primary_keyword?: string;
  secondary_keywords?: string;
  lifestyle_usage_rules?: string;
  pairs_well_with?: string;
};

type CopyJson = {
  "alivio.seo_title"?: string;
  "alivio.seo_description"?: string;
  "alivio.hero_hook"?: string;
  "alivio.hero_description"?: string;
  "alivio.what_it_is"?: string;
  "alivio.whats_included"?: string[];
  "alivio.spoonie_approved"?: { badge?: string; reason?: string };
  "alivio.what_spoonies_love"?: string[];
  "alivio.top_benefits"?: string[];
  "alivio.worth_it_because"?: string[];
  "alivio.why_this_helps"?: string;
  "alivio.how_it_works"?: string[];
  "alivio.how_to_use"?: { steps?: string[]; spoonie_tip?: string };
  "alivio.use_cases"?: string[];
  "alivio.in_the_box"?: string[];
  "alivio.specs_table"?: Array<{ label: string; value: string }>;
  "alivio.safety_note"?: string;
  "alivio.founder_fave"?: { amanda?: string; michelle?: string };
  "alivio.faq"?: Array<{ question: string; answer: string }>;
  "alivio.pairs_well_with"?: string[];
  "alivio.tools_and_support"?: string[];
  "alivio.loyalty"?: string[];
  "alivio.impact"?: string[];
  "alivio.image_alt_text"?: string[];
};

type LifestyleGenJson = {
  shot_1: { use_case: string; scene_summary: string; gemini_prompt: string };
  shot_2: { use_case: string; scene_summary: string; gemini_prompt: string };
  shot_3: { use_case: string; scene_summary: string; gemini_prompt: string };
};

type SeoJson = {
  seo_title: string;
  meta_description: string;
  handle: string;
  tags: string[];
  keyword_clusters: Array<{ cluster: string; keywords: string[] }>;
};

export type GeneratedText = {
  title: string;
  handle: string;
  descriptionHtml: string;
  seo: { title: string; description: string };
  tags: string[];
  metafields: Array<{ namespace: string; key: string; type: string; value: string }>;
  category: string;
  attributes: Record<string, unknown>;
  referenceImages: string[];
  lifestylePrompts: Record<string, string>;
  promptCtx: {
    title: string;
    attributes: Record<string, unknown>;
    category: string;
  };
};

function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("tens")) return "TENS Unit";
  if (n.includes("ice pack")) return "Cold Therapy";
  if (n.includes("heat") || n.includes("warm")) return "Heat Therapy";
  if (n.includes("brace") || n.includes("support")) return "Body Support";
  if (n.includes("pillow") || n.includes("cushion")) return "Comfort";
  return "Wellness Tool";
}

function coerceText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === "string" ? x : coerceText(x)))
      .filter(Boolean)
      .join("\n\n");
  }
  if (typeof v === "object") {
    const obj = v as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.value === "string") return obj.value;
    if (Array.isArray(obj.paragraphs)) return coerceText(obj.paragraphs);
    return "";
  }
  return String(v);
}

function esc(s: unknown): string {
  return coerceText(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildDescriptionHtml(c: Record<string, unknown>): string {
  const get = <T>(k: string) => c[k] as T | undefined;
  const parts: string[] = [];
  const hook = get<string>("alivio.hero_hook");
  if (hook) parts.push(`<p><strong>${esc(hook)}</strong></p>`);
  const heroDesc = get<string>("alivio.hero_description");
  if (heroDesc) parts.push(`<p>${esc(heroDesc)}</p>`);
  const why = get<string>("alivio.why_this_helps");
  if (why)
    parts.push(
      `<h3>Why this helps</h3><p>${esc(why).replace(/\n+/g, "</p><p>")}</p>`,
    );
  const benefits = get<string[]>("alivio.top_benefits");
  if (benefits?.length) {
    parts.push(
      `<h3>Top benefits</h3><ul>${benefits.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`,
    );
  }
  const howToUse = get<{ steps?: string[]; spoonie_tip?: string }>(
    "alivio.how_to_use",
  );
  if (howToUse?.steps?.length) {
    parts.push(
      `<h3>How to use</h3><ol>${howToUse.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>`,
    );
    if (howToUse.spoonie_tip)
      parts.push(`<p><em>Spoonie tip: ${esc(howToUse.spoonie_tip)}</em></p>`);
  }
  const inBox = get<string[]>("alivio.in_the_box");
  if (inBox?.length) {
    parts.push(
      `<h3>In the box</h3><ul>${inBox.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`,
    );
  }
  const faq = get<Array<{ question: string; answer: string }>>("alivio.faq");
  if (faq?.length) {
    parts.push(
      `<h3>FAQ</h3>${faq.map((f) => `<p><strong>${esc(f.question)}</strong><br/>${esc(f.answer)}</p>`).join("")}`,
    );
  }
  return parts.join("\n");
}

function buildMetafields(
  c: Record<string, unknown>,
): Array<{ namespace: string; key: string; type: string; value: string }> {
  const out: Array<{ namespace: string; key: string; type: string; value: string }> = [];
  for (const [fullKey, value] of Object.entries(c)) {
    if (!fullKey.startsWith("alivio.")) continue;
    if (value == null) continue;
    const key = fullKey.slice("alivio.".length);
    const namespace = "alivio";
    if (typeof value === "string") {
      out.push({ namespace, key, type: "multi_line_text_field", value });
    } else if (Array.isArray(value)) {
      const allStrings = value.every((x) => typeof x === "string");
      if (allStrings) {
        out.push({
          namespace,
          key,
          type: "list.single_line_text_field",
          value: JSON.stringify(value),
        });
      } else {
        out.push({ namespace, key, type: "json", value: JSON.stringify(value) });
      }
    } else if (typeof value === "object") {
      out.push({ namespace, key, type: "json", value: JSON.stringify(value) });
    }
  }
  return out;
}

export async function generateTextForRow(
  row: CsvRow,
  preScraped?: ScrapedProduct | null,
): Promise<GeneratedText> {
  if (!row.product_name) throw new Error("product_name is required");

  const scraped = preScraped !== undefined
    ? preScraped
    : await scrapeBest(row).catch(() => null);

  const apifyAmazon = scraped
    ? {
        source_url: scraped.sourceUrl,
        title: scraped.title,
        description: scraped.description,
        price: scraped.price,
        images: scraped.images,
        attributes: scraped.attributes,
      }
    : null;

  const attributes: Record<string, unknown> = {
    primary_keyword: row.primary_keyword || "",
    secondary_keywords: row.secondary_keywords || "",
    pairs_well_with: row.pairs_well_with || "",
    lifestyle_usage_rules: row.lifestyle_usage_rules || "",
    ...scraped?.attributes,
  };

  const category = row.category || inferCategory(row.product_name);

  const ctx = {
    title: row.product_name,
    category,
    attributes,
    description: scraped?.description || "",
    apify_1688: null,
    apify_amazon: apifyAmazon,
    alivio_seo_title: "",
    alivio_seo_description: "",
  };

  const copyPrompt = await loadPrompt("copy/copy_pdp_v1.md");
  const copy = await claudeJson<CopyJson>({
    prompt: render(copyPrompt.body, ctx),
    maxTokens: 16000,
    temperature: 0.3,
  });

  const lifestyleGenPrompt = await loadPrompt("lifestyle/lifestyle_prompt_generator.md");
  const lifestylePrompts = await claudeJson<LifestyleGenJson>({
    prompt: render(lifestyleGenPrompt.body, {
      title: row.product_name,
      category,
      attributes,
      use_cases: copy["alivio.use_cases"] || [],
      how_it_works: copy["alivio.how_it_works"] || [],
      how_to_use_steps: copy["alivio.how_to_use"]?.steps || [],
    }),
    maxTokens: 2000,
    temperature: 0.6,
  });

  const seoPrompt = await loadPrompt("seo/seo_v1.md");
  const seo = await claudeJson<SeoJson>({
    prompt: render(seoPrompt.body, {
      ...ctx,
      alivio_seo_title: copy["alivio.seo_title"] || "",
      alivio_seo_description: copy["alivio.seo_description"] || "",
    }),
    maxTokens: 3000,
    temperature: 0.3,
  });

  const keywords = [
    row.primary_keyword || "",
    ...(row.secondary_keywords?.split(",").map((k) => k.trim()) || []),
  ].filter((k) => k.length > 0);
  await rankKeywords(keywords).catch(() => null);

  const fullAttributes: Record<string, unknown> = {
    ...attributes,
    whats_included_list:
      (copy["alivio.in_the_box"] as string[] | undefined)?.join(", ") || "",
    use_cases: copy["alivio.use_cases"] || [],
    how_it_works:
      (copy["alivio.how_it_works"] as string[] | undefined)?.join(" ") || "",
    how_to_use_steps: copy["alivio.how_to_use"]?.steps || [],
  };

  return {
    title: row.product_name,
    handle: seo.handle,
    descriptionHtml: buildDescriptionHtml(copy),
    seo: { title: seo.seo_title, description: seo.meta_description },
    tags: seo.tags,
    metafields: buildMetafields(copy),
    category,
    attributes: fullAttributes,
    referenceImages: scraped?.images.slice(0, 3) || [],
    lifestylePrompts: {
      scale_correct: lifestylePrompts.shot_1.gemini_prompt,
      human_perspective: lifestylePrompts.shot_2.gemini_prompt,
      ambient: lifestylePrompts.shot_3.gemini_prompt,
    },
    promptCtx: {
      title: row.product_name,
      attributes: fullAttributes,
      category,
    },
  };
}

export type GeneratedImage = {
  shortKey: string;
  label: string;
  alt: string;
  resourceUrl: string;
  mimeType: string;
  bytes: Uint8Array;
  sha256: string;
};

export async function generateImageForSlot(opts: {
  creds: ShopifyCreds;
  slot: ImageSlot;
  promptCtx: GeneratedText["promptCtx"];
  alt?: string;
  referenceImages: string[];
  lifestylePrompt?: string;
}): Promise<GeneratedImage> {
  let rendered: string;
  if (opts.lifestylePrompt) {
    rendered = opts.lifestylePrompt;
  } else {
    const prompt = await loadPrompt(opts.slot.promptPath);
    rendered = render(prompt.body, {
      ...opts.promptCtx,
      slot: { key: opts.slot.shortKey, label: opts.slot.label },
    });
  }

  const refs: Array<{ bytes: Uint8Array; mimeType: string }> = [];
  for (const url of opts.referenceImages.slice(0, 3)) {
    try {
      refs.push(await fetchReferenceImage(url));
    } catch {
      // skip unreachable reference
    }
  }

  const img = await geminiImage({ prompt: rendered, referenceImages: refs });

  const filename =
    `${opts.promptCtx.title || "product"}-${opts.slot.shortKey}.${mimeExt(img.mimeType)}`
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, "-");
  const target = await stageUpload(opts.creds, {
    filename,
    mimeType: img.mimeType,
    bytesSize: img.bytes.length,
  });
  const resourceUrl = await uploadBytesToStaged(target, img.bytes, img.mimeType);

  const sha = createHash("sha256").update(Buffer.from(img.bytes)).digest("hex");

  return {
    shortKey: opts.slot.shortKey,
    label: opts.slot.label,
    alt:
      opts.alt ?? opts.slot.altPattern.replace("{{title}}", opts.promptCtx.title || ""),
    resourceUrl,
    mimeType: img.mimeType,
    bytes: img.bytes,
    sha256: sha,
  };
}

function mimeExt(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("webp")) return "webp";
  return "png";
}

/**
 * Run the full pipeline for one job_item row:
 *   1. Scrape + generate copy/SEO/lifestyle prompts via Claude.
 *   2. Insert a `products` row with status 'generating_images'.
 *   3. For each of the 15 image slots, generate via Gemini, upload to Shopify
 *      staged storage, write a `product_assets` row.
 *   4. Mark product 'completed' (or 'failed_*' on error).
 *   5. Update the job_item status + the parent job's counters.
 *
 * Errors are caught at each stage so a single failed slot doesn't kill the
 * whole product, and a single failed product doesn't kill the whole job.
 */
export async function processJobItem(opts: {
  jobId: string;
  itemId: string;
  storeId: string;
  creds: ShopifyCreds;
  row: CsvRow;
}): Promise<void> {
  const { jobId, itemId, storeId, creds, row } = opts;

  await supabaseAdmin
    .from("job_items")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", itemId);

  // 1. Insert (or upsert) a products row in 'generating_copy' state.
  const sourceUrl =
    row.alibaba1688 || row.amazon || row.aliexpress || row.alibaba || row.other || "";
  const supplier =
    (row.alibaba1688 && "1688") ||
    (row.amazon && "amazon") ||
    (row.aliexpress && "aliexpress") ||
    (row.alibaba && "alibaba") ||
    "generic";

  const { data: existing } = await supabaseAdmin
    .from("products")
    .select("id")
    .eq("store_id", storeId)
    .eq("source_url", sourceUrl)
    .maybeSingle();

  let productId: string;
  if (existing?.id) {
    productId = existing.id;
    await supabaseAdmin
      .from("products")
      .update({
        status: "generating_copy",
        job_item_id: itemId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);
  } else {
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("products")
      .insert({
        store_id: storeId,
        job_item_id: itemId,
        source_url: sourceUrl || `placeholder://${itemId}`,
        source_supplier: supplier,
        title: row.product_name,
        category: row.category || null,
        status: "generating_copy",
      })
      .select("id")
      .single();
    if (insertErr) throw new Error(`insert product: ${insertErr.message}`);
    productId = inserted.id;
  }

  await supabaseAdmin
    .from("job_items")
    .update({ product_id: productId, updated_at: new Date().toISOString() })
    .eq("id", itemId);

  // 2. Generate text.
  let text: GeneratedText;
  try {
    text = await generateTextForRow(row);
  } catch (e) {
    const msg = (e as Error).message;
    await supabaseAdmin
      .from("products")
      .update({
        status: "failed_copy",
        failure_reason: msg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);
    await markItemFailed(jobId, itemId, msg);
    return;
  }

  // 3. Persist text/SEO to products row.
  await supabaseAdmin
    .from("products")
    .update({
      title: text.title,
      shopify_handle: text.handle,
      description_raw: text.descriptionHtml,
      attributes: {
        ...text.attributes,
        seo: text.seo,
        tags: text.tags,
        metafields: text.metafields,
        lifestylePrompts: text.lifestylePrompts,
        referenceImages: text.referenceImages,
      },
      status: "generating_images",
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  // 4. Image generation — bounded concurrency (3 at a time) to avoid hammering Gemini.
  const slots = IMAGE_SLOTS;
  const errors: string[] = [];
  let cursor = 0;
  const CONCURRENCY = 3;

  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= slots.length) return;
      const slot = slots[idx];
      try {
        const img = await generateImageForSlot({
          creds,
          slot,
          promptCtx: text.promptCtx,
          referenceImages: text.referenceImages,
          lifestylePrompt: text.lifestylePrompts[slot.shortKey],
        });
        await supabaseAdmin.from("product_assets").upsert(
          {
            product_id: productId,
            kind: "generated",
            slot: slot.shortKey,
            storage_key: img.resourceUrl,
            public_url: img.resourceUrl,
            sha256: img.sha256,
            mime_type: img.mimeType,
            bytes: img.bytes.length,
            meta: { alt: img.alt, label: img.label },
          },
          { onConflict: "product_id,slot,sha256" },
        );
        await supabaseAdmin.from("generations").insert({
          product_id: productId,
          kind: "image",
          slot: slot.shortKey,
          model: "gemini-2.5-flash-image",
          status: "completed",
        });
      } catch (e) {
        const msg = (e as Error).message;
        errors.push(`${slot.shortKey}: ${msg}`);
        await supabaseAdmin.from("generations").insert({
          product_id: productId,
          kind: "image",
          slot: slot.shortKey,
          model: "gemini-2.5-flash-image",
          status: "failed",
          error: msg,
        });
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // 5. Final status.
  const allFailed = errors.length === slots.length;
  await supabaseAdmin
    .from("products")
    .update({
      status: allFailed ? "failed_images" : "completed",
      failure_reason: errors.length > 0 ? errors.join("\n") : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  await supabaseAdmin
    .from("job_items")
    .update({
      status: allFailed ? "failed" : "completed",
      error: errors.length > 0 ? errors.join("\n").slice(0, 1000) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);

  await bumpJobCounters(jobId, allFailed ? "failed" : "completed");
}

async function markItemFailed(jobId: string, itemId: string, error: string) {
  await supabaseAdmin
    .from("job_items")
    .update({
      status: "failed",
      error: error.slice(0, 1000),
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);
  await bumpJobCounters(jobId, "failed");
}

async function bumpJobCounters(jobId: string, outcome: "completed" | "failed") {
  const field = outcome === "completed" ? "completed_items" : "failed_items";
  const { data: job } = await supabaseAdmin
    .from("jobs")
    .select("total_items, completed_items, failed_items")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) return;
  const next = {
    completed_items: job.completed_items + (outcome === "completed" ? 1 : 0),
    failed_items: job.failed_items + (outcome === "failed" ? 1 : 0),
    updated_at: new Date().toISOString(),
  } as Record<string, unknown>;
  const finished = next.completed_items as number;
  const failed = next.failed_items as number;
  if (finished + failed >= job.total_items) {
    next.status = failed === job.total_items ? "failed" : failed > 0 ? "partial" : "completed";
    next.finished_at = new Date().toISOString();
  }
  void field;
  await supabaseAdmin.from("jobs").update(next).eq("id", jobId);
}

export { slotByShortKey };

// ─── Two-phase pipeline ─────────────────────────────────────────────
//
// The original `processJobItem` ran scrape → copy → images → done in one
// invocation. The product flow we ship today splits at the scrape boundary:
//
//   Phase A (`processJobItemScrape`) — runs from the CSV/runner side.
//     Scrapes the supplier URL (Apify → cheerio fallback), persists the raw
//     scraped data + reference images, and leaves the row in `awaiting_review`
//     so the operator can inspect what was inside the link before any AI
//     spend happens.
//
//   Phase B (`processProductGenerate`) — triggered by the operator pressing
//     "Continue" on the review page. Runs Claude copy + SEO + lifestyle
//     prompts, then Gemini generates the 14 product images. On success the
//     parent job_item is marked completed and counters are bumped.

async function loadJobItemRow(itemId: string): Promise<CsvRow | null> {
  const { data } = await supabaseAdmin
    .from("job_items")
    .select("raw_row")
    .eq("id", itemId)
    .maybeSingle();
  return ((data?.raw_row as CsvRow) || null);
}

export async function processJobItemScrape(opts: {
  jobId: string;
  itemId: string;
  storeId: string;
  row: CsvRow;
}): Promise<{ productId: string }> {
  const { jobId, itemId, storeId, row } = opts;
  await supabaseAdmin
    .from("job_items")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", itemId);

  const sourceUrl =
    row.alibaba1688 || row.amazon || row.aliexpress || row.alibaba || row.other || "";
  const supplier =
    (row.alibaba1688 && "1688") ||
    (row.amazon && "amazon") ||
    (row.aliexpress && "aliexpress") ||
    (row.alibaba && "alibaba") ||
    "generic";

  const { data: existing } = await supabaseAdmin
    .from("products")
    .select("id")
    .eq("store_id", storeId)
    .eq("source_url", sourceUrl || `placeholder://${itemId}`)
    .maybeSingle();

  let productId: string;
  if (existing?.id) {
    productId = existing.id;
    await supabaseAdmin
      .from("products")
      .update({
        status: "scraping",
        job_item_id: itemId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);
  } else {
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("products")
      .insert({
        store_id: storeId,
        job_item_id: itemId,
        source_url: sourceUrl || `placeholder://${itemId}`,
        source_supplier: supplier,
        title: row.product_name,
        category: row.category || null,
        status: "scraping",
      })
      .select("id")
      .single();
    if (insertErr) throw new Error(`insert product: ${insertErr.message}`);
    productId = inserted.id;
  }

  await supabaseAdmin
    .from("job_items")
    .update({ product_id: productId, updated_at: new Date().toISOString() })
    .eq("id", itemId);

  // Scrape — never throw out of phase A. A failed scrape still leaves the
  // product reviewable (with whatever the CSV provided) so the operator can
  // decide whether to retry or skip.
  let scraped: ScrapedProduct | null = null;
  let scrapeError: string | null = null;
  try {
    scraped = await scrapeBest(row);
  } catch (e) {
    scrapeError = (e as Error).message;
  }

  // Persist scraped data so phase B can reuse it (no double-scrape) and the
  // review page can render it.
  await supabaseAdmin
    .from("products")
    .update({
      description_raw: scraped?.description || null,
      raw_data: {
        scraped: scraped || null,
        scrapeError,
        csvRow: row,
      },
      status: scraped ? "awaiting_review" : scraped === null && scrapeError ? "awaiting_review" : "awaiting_review",
      failure_reason: scrapeError,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  // Save the supplier images as reference assets — they show up on the
  // review page and are passed to Gemini as visual context during phase B.
  if (scraped?.images?.length) {
    const refRows = scraped.images.slice(0, 10).map((url, i) => ({
      product_id: productId,
      kind: "reference",
      slot: `ref_${i}`,
      storage_key: url,
      public_url: url,
      mime_type: "image/jpeg",
      bytes: 0,
      sha256: createHash("sha256").update(url).digest("hex").slice(0, 32),
      meta: { source: "scrape", origin: scraped.scrapedVia || "fetch" },
    }));
    // Best effort — collisions on (product_id,slot,sha256) just skip.
    await supabaseAdmin
      .from("product_assets")
      .upsert(refRows, { onConflict: "product_id,slot,sha256" });
  }

  await supabaseAdmin
    .from("job_items")
    .update({
      status: "awaiting_review",
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);

  // Roll up the parent job to `awaiting_review` once nothing is left pending
  // or running. Phase B will move it back to `running` and then to a
  // terminal state when the operator finalizes each item.
  const { data: stillOpen } = await supabaseAdmin
    .from("job_items")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId)
    .in("status", ["pending", "running"]);
  if (!stillOpen) {
    await supabaseAdmin
      .from("jobs")
      .update({
        status: "awaiting_review",
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }

  return { productId };
}

export async function processProductGenerate(opts: {
  productId: string;
  storeId: string;
  creds: ShopifyCreds;
}): Promise<void> {
  const { productId, storeId, creds } = opts;

  // Resolve the product + linked job_item + the raw CSV row we stashed
  // during phase A.
  const { data: product } = await supabaseAdmin
    .from("products")
    .select("id, store_id, job_item_id, raw_data, title")
    .eq("id", productId)
    .maybeSingle();
  if (!product) throw new Error("Product not found");
  if (product.store_id !== storeId)
    throw new Error("Product belongs to a different store");

  const raw = (product.raw_data || {}) as {
    scraped?: ScrapedProduct | null;
    csvRow?: CsvRow;
  };
  const row = raw.csvRow ||
    (product.job_item_id ? await loadJobItemRow(product.job_item_id) : null) ||
    ({ product_name: product.title || "" } as CsvRow);
  if (!row.product_name && product.title) row.product_name = product.title;
  const preScraped = raw.scraped ?? null;

  const jobId = await (async () => {
    if (!product.job_item_id) return null;
    const { data } = await supabaseAdmin
      .from("job_items")
      .select("job_id")
      .eq("id", product.job_item_id)
      .maybeSingle();
    return (data?.job_id as string) || null;
  })();

  await supabaseAdmin
    .from("products")
    .update({
      status: "generating_copy",
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);
  if (product.job_item_id) {
    await supabaseAdmin
      .from("job_items")
      .update({ status: "running", updated_at: new Date().toISOString() })
      .eq("id", product.job_item_id);
  }
  if (jobId) {
    await supabaseAdmin
      .from("jobs")
      .update({ status: "running", updated_at: new Date().toISOString() })
      .eq("id", jobId);
  }

  let text: GeneratedText;
  try {
    text = await generateTextForRow(row, preScraped);
  } catch (e) {
    const msg = (e as Error).message;
    await supabaseAdmin
      .from("products")
      .update({
        status: "failed_copy",
        failure_reason: msg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);
    if (product.job_item_id && jobId) {
      await markItemFailed(jobId, product.job_item_id, msg);
    }
    throw e;
  }

  await supabaseAdmin
    .from("products")
    .update({
      title: text.title,
      shopify_handle: text.handle,
      description_raw: text.descriptionHtml,
      attributes: {
        ...text.attributes,
        seo: text.seo,
        tags: text.tags,
        metafields: text.metafields,
        lifestylePrompts: text.lifestylePrompts,
        referenceImages: text.referenceImages,
      },
      status: "generating_images",
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  const slots = IMAGE_SLOTS;
  const errors: string[] = [];
  let cursor = 0;
  const CONCURRENCY = 3;

  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= slots.length) return;
      const slot = slots[idx];
      try {
        const img = await generateImageForSlot({
          creds,
          slot,
          promptCtx: text.promptCtx,
          referenceImages: text.referenceImages,
          lifestylePrompt: text.lifestylePrompts[slot.shortKey],
        });
        await supabaseAdmin.from("product_assets").upsert(
          {
            product_id: productId,
            kind: "generated",
            slot: slot.shortKey,
            storage_key: img.resourceUrl,
            public_url: img.resourceUrl,
            sha256: img.sha256,
            mime_type: img.mimeType,
            bytes: img.bytes.length,
            meta: { alt: img.alt, label: img.label },
          },
          { onConflict: "product_id,slot,sha256" },
        );
        await supabaseAdmin.from("generations").insert({
          product_id: productId,
          kind: "image",
          slot: slot.shortKey,
          model: "gemini-2.5-flash-image",
          status: "completed",
        });
      } catch (e) {
        const msg = (e as Error).message;
        errors.push(`${slot.shortKey}: ${msg}`);
        await supabaseAdmin.from("generations").insert({
          product_id: productId,
          kind: "image",
          slot: slot.shortKey,
          model: "gemini-2.5-flash-image",
          status: "failed",
          error: msg,
        });
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const allFailed = errors.length === slots.length;
  await supabaseAdmin
    .from("products")
    .update({
      status: allFailed ? "failed_images" : "completed",
      failure_reason: errors.length > 0 ? errors.join("\n") : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  if (product.job_item_id && jobId) {
    await supabaseAdmin
      .from("job_items")
      .update({
        status: allFailed ? "failed" : "completed",
        error: errors.length > 0 ? errors.join("\n").slice(0, 1000) : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.job_item_id);
    await bumpJobCounters(jobId, allFailed ? "failed" : "completed");
  }
}

/**
 * Sweep job_items that are stuck in `status=running` past the grace window.
 *
 * On Vercel a serverless function can die mid-flight (cold-shutdown, timeout,
 * a hot reload in dev). When that happens the item row stays as `running`
 * forever and the runner will never pick it up again (it only looks at
 * `pending`). This sweep looks at all stuck items belonging to `storeId` and
 * decides per-item whether the underlying product looks complete (enough
 * generated assets) and should be finalized, or whether to mark it failed so
 * the job can roll up to a terminal status.
 */
export async function recoverStuckItems(
  storeId: string,
  graceMinutes = 10,
): Promise<{ finalized: number; failed: number }> {
  const cutoff = new Date(Date.now() - graceMinutes * 60_000).toISOString();
  // Pull jobs for this store first so we can filter items correctly.
  const { data: jobRows } = await supabaseAdmin
    .from("jobs")
    .select("id")
    .eq("store_id", storeId)
    .in("status", ["running", "pending", "dispatched"]);
  if (!jobRows?.length) return { finalized: 0, failed: 0 };
  const jobIds = jobRows.map((j) => j.id as string);

  const { data: stuck } = await supabaseAdmin
    .from("job_items")
    .select("id, job_id, product_id, updated_at")
    .in("job_id", jobIds)
    .eq("status", "running")
    .lt("updated_at", cutoff);
  if (!stuck?.length) return { finalized: 0, failed: 0 };

  const minSlots = Math.max(1, Math.floor(IMAGE_SLOTS.length / 2));
  let finalized = 0;
  let failed = 0;

  for (const item of stuck) {
    const itemId = item.id as string;
    const jobId = item.job_id as string;
    const productId = item.product_id as string | null;

    let canFinalize = false;
    if (productId) {
      const { count } = await supabaseAdmin
        .from("product_assets")
        .select("id", { count: "exact", head: true })
        .eq("product_id", productId)
        .eq("kind", "generated");
      canFinalize = (count ?? 0) >= minSlots;
    }

    if (canFinalize && productId) {
      await supabaseAdmin
        .from("products")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId);
      await supabaseAdmin
        .from("job_items")
        .update({
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", itemId);
      await bumpJobCounters(jobId, "completed");
      finalized++;
    } else {
      await supabaseAdmin
        .from("job_items")
        .update({
          status: "failed",
          error: "stuck-recovery: runner died before completion",
          updated_at: new Date().toISOString(),
        })
        .eq("id", itemId);
      if (productId) {
        await supabaseAdmin
          .from("products")
          .update({
            status: "failed_images",
            failure_reason: "runner died before completion",
            updated_at: new Date().toISOString(),
          })
          .eq("id", productId);
      }
      await bumpJobCounters(jobId, "failed");
      failed++;
    }
  }
  return { finalized, failed };
}

