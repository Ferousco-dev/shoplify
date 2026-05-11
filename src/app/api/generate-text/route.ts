import { NextResponse } from "next/server";
import { scrapeBest } from "@/lib/scrape";
import { loadPrompt, render } from "@/lib/prompts";
import { claudeJson } from "@/lib/claude";
import { rankKeywords, generateSeoRecommendations } from "@/lib/serp";
import { IMAGE_SLOTS } from "@/lib/slots";
import { requireShopify } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
// 60s wasn't enough — text generation + 3 fallback tiers + SERP can take
// ~90-120s on a cold start. Vercel Pro caps at 300s; Hobby at 60s. Bump to
// 300 for safety; on Hobby this still completes since the *runtime* is fine,
// the limit just caps the longest-possible request.
export const maxDuration = 300;

type CsvRow = {
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

export async function POST(req: Request) {
  try {
    await requireShopify();
  } catch {
    return NextResponse.json(
      { error: "Not connected to Shopify" },
      { status: 401 },
    );
  }

  const row = (await req.json()) as CsvRow;
  if (!row.product_name) {
    return NextResponse.json(
      { error: "product_name is required" },
      { status: 400 },
    );
  }

  try {

  // 1. Scrape the best supplier URL we have
  const scraped = await scrapeBest(row).catch(() => null);

  // 2. Build the ctx we'll feed both prompts
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

  const ctx = {
    title: row.product_name,
    category: row.category || inferCategory(row.product_name),
    attributes,
    description: scraped?.description || "",
    apify_1688: null,
    apify_amazon: apifyAmazon,
    alivio_seo_title: "",
    alivio_seo_description: "",
  };

  // 3. Generate copy (Alivio brand-voiced metafields)
  const copyPrompt = await loadPrompt("copy/copy_pdp_v1.md");
  const copyRendered = render(copyPrompt.body, ctx);

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
    field_notes?: Record<string, { inferred?: boolean; note?: string }>;
  };

  const copy = await claudeJson<CopyJson>({
    prompt: copyRendered,
    maxTokens: 16000,
    temperature: 0.3,
  });

  // 4. Generate lifestyle prompts dynamically from Claude
  const lifestyleGenPrompt = await loadPrompt(
    "lifestyle/lifestyle_prompt_generator.md",
  );
  const lifestyleGenCtx = {
    title: row.product_name,
    category: ctx.category,
    attributes,
    use_cases: copy["alivio.use_cases"] || [],
    how_it_works: copy["alivio.how_it_works"] || [],
    how_to_use_steps: copy["alivio.how_to_use"]?.steps || [],
  };
  const lifestyleGenRendered = render(lifestyleGenPrompt.body, lifestyleGenCtx);

  type LifestyleGenJson = {
    shot_1: { use_case: string; scene_summary: string; gemini_prompt: string };
    shot_2: { use_case: string; scene_summary: string; gemini_prompt: string };
    shot_3: { use_case: string; scene_summary: string; gemini_prompt: string };
  };

  const lifestylePrompts = await claudeJson<LifestyleGenJson>({
    prompt: lifestyleGenRendered,
    maxTokens: 2000,
    temperature: 0.6,
  });

  // 5. Generate SEO (slug, tags, keyword clusters)
  const seoPrompt = await loadPrompt("seo/seo_v1.md");
  const seoCtx = {
    ...ctx,
    alivio_seo_title: copy["alivio.seo_title"] || "",
    alivio_seo_description: copy["alivio.seo_description"] || "",
  };
  const seoRendered = render(seoPrompt.body, seoCtx);

  type SeoJson = {
    seo_title: string;
    meta_description: string;
    handle: string;
    tags: string[];
    keyword_clusters: Array<{ cluster: string; keywords: string[] }>;
  };

  const seo = await claudeJson<SeoJson>({
    prompt: seoRendered,
    maxTokens: 3000,
    temperature: 0.3,
  });

  // 5b. Check keyword rankings on Google SERP + Shopify
  const keywords = [
    row.primary_keyword || "",
    ...(row.secondary_keywords?.split(",").map((k) => k.trim()) || []),
  ].filter((k) => k.length > 0);

  const serpAnalysis = await rankKeywords(keywords).catch(() => {
    console.warn("SERP ranking check failed; proceeding without live data");
    return keywords.map((k) => ({
      keyword: k,
      is_rankable: true,
      recommendation: "Unable to check live SERP; rank with caution",
    }));
  });

  const seoRecommendations = generateSeoRecommendations(serpAnalysis);

  // 6. Build descriptionHtml for Shopify body_html
  const descriptionHtml = buildDescriptionHtml(copy);

  // 7. Build a per-slot image generation context (used by /api/generate-image)
  const slots = IMAGE_SLOTS.map((s) => ({
    shortKey: s.shortKey,
    label: s.label,
    promptPath: s.promptPath,
    alt: s.altPattern.replace("{{title}}", row.product_name || ""),
  }));

    // Save draft product to Supabase for tracking
    try {
      await supabaseAdmin
        .from("products")
        .insert({
          title: row.product_name,
          source_supplier: row.amazon ? "amazon" : row.alibaba ? "alibaba" : "other",
          status: "draft",
          attributes: {
            seo: { title: seo.seo_title, description: seo.meta_description },
            tags: seo.tags || [],
            metafields: buildMetafields(copy),
            handle: seo.handle,
          },
          raw_data: row,
        });
    } catch (dbError) {
      console.warn("Failed to save draft to Supabase:", dbError);
      // Don't fail the request if DB save fails
    }

    return NextResponse.json({
      title: row.product_name,
      handle: seo.handle,
      descriptionHtml,
      seo: { title: seo.seo_title, description: seo.meta_description },
      tags: seo.tags,
      keywordClusters: seo.keyword_clusters,
      serpAnalysis,
      seoRecommendations,
      metafields: buildMetafields(copy),
      slots,
      referenceImages: scraped?.images.slice(0, 3) || [],
      lifestylePrompts: {
        scale_correct: lifestylePrompts.shot_1.gemini_prompt,
        human_perspective: lifestylePrompts.shot_2.gemini_prompt,
        ambient: lifestylePrompts.shot_3.gemini_prompt,
      },
      promptCtx: {
        title: row.product_name,
        attributes: {
          ...attributes,
          whats_included_list:
            (copy["alivio.in_the_box"] as string[] | undefined)?.join(", ") || "",
          use_cases: copy["alivio.use_cases"] || [],
          how_it_works:
            (copy["alivio.how_it_works"] as string[] | undefined)?.join(" ") ||
            "",
          how_to_use_steps: copy["alivio.how_to_use"]?.steps || [],
        },
        category: ctx.category,
      },
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("generate-text error:", error, e);
    return NextResponse.json(
      { error: `Generation failed: ${error}` },
      { status: 500 },
    );
  }
}

function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("tens")) return "TENS Unit";
  if (n.includes("ice pack")) return "Cold Therapy";
  if (n.includes("heat") || n.includes("warm")) return "Heat Therapy";
  if (n.includes("brace") || n.includes("support")) return "Body Support";
  if (n.includes("pillow") || n.includes("cushion")) return "Comfort";
  return "Wellness Tool";
}

function esc(s: unknown): string {
  return String(s ?? "")
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
  const out: Array<{
    namespace: string;
    key: string;
    type: string;
    value: string;
  }> = [];
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
        out.push({
          namespace,
          key,
          type: "json",
          value: JSON.stringify(value),
        });
      }
    } else if (typeof value === "object") {
      out.push({ namespace, key, type: "json", value: JSON.stringify(value) });
    }
  }
  return out;
}
