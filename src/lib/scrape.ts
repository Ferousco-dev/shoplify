import * as cheerio from "cheerio";
import { apifyEnabled, fetchViaApify } from "@/lib/apify";

export type ScrapedProduct = {
  sourceUrl: string;
  finalUrl?: string;
  title?: string;
  description?: string;
  price?: string;
  images: string[];
  attributes: Record<string, string>;
  // Raw bits we surface to the user on the review page.
  rawText?: string;
  rawMarkdown?: string;
  scrapedVia?: "apify" | "fetch";
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

async function fetchHtml(url: string, signal?: AbortSignal): Promise<{
  html: string;
  finalUrl: string;
  text?: string;
  markdown?: string;
  via: "apify" | "fetch";
}> {
  // Prefer Apify when configured — it handles JS-rendered and anti-bot pages.
  if (apifyEnabled()) {
    try {
      const a = await fetchViaApify(url);
      return {
        html: a.html,
        finalUrl: a.finalUrl,
        text: a.text,
        markdown: a.markdown,
        via: "apify",
      };
    } catch (e) {
      // Fall through to direct fetch — Apify can timeout or block.
      console.warn(`[scrape] Apify failed for ${url}: ${(e as Error).message}`);
    }
  }
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal,
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`scrape ${url}: HTTP ${res.status}`);
  return {
    html: await res.text(),
    finalUrl: res.url || url,
    via: "fetch",
  };
}

/**
 * Fetch the URL (via Apify if available, plain fetch otherwise) and run a
 * cheerio parse to extract product signal — title, description, images,
 * price, JSON-LD attributes. The raw text/markdown from Apify is surfaced
 * untouched on the review page so the user can see what was actually inside
 * the supplier link.
 */
export async function scrapeUrl(url: string, signal?: AbortSignal): Promise<ScrapedProduct> {
  const fetched = await fetchHtml(url, signal);
  const html = fetched.html;
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr("content") ||
    $('meta[name="twitter:title"]').attr("content") ||
    $("title").first().text().trim() ||
    $("h1").first().text().trim();

  const description =
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    $('meta[name="twitter:description"]').attr("content");

  // Filter to avoid UI sprites, logos, icons
  const isBadImage = (url: string) => {
    const bad = [
      'sprite',
      'logo',
      'icon',
      'badge',
      'nav-',
      'button',
      'pixel',
      'analytics',
      'tracker',
      'facebook',
      'google',
      'amazon.com/images/G/',
    ];
    return bad.some(pattern => url.toLowerCase().includes(pattern));
  };

  const ogImages = $('meta[property="og:image"]')
    .map((_, el) => $(el).attr("content"))
    .get()
    .filter((s): s is string => !!s && !isBadImage(s));

  const inlineImages = $("img[src]")
    .map((_, el) => $(el).attr("src"))
    .get()
    .filter((s): s is string => !!s && /^https?:\/\//.test(s) && !isBadImage(s));

  const images = [...new Set([...ogImages, ...inlineImages])].slice(0, 10);

  const price =
    $('meta[property="product:price:amount"]').attr("content") ||
    $('meta[property="og:price:amount"]').attr("content") ||
    $('[itemprop="price"]').attr("content") ||
    $('[itemprop="price"]').first().text().trim() ||
    undefined;

  // Try JSON-LD product schema for attributes
  const attributes: Record<string, string> = {};
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      const products = Array.isArray(data) ? data : [data];
      for (const p of products) {
        if (p["@type"] === "Product") {
          if (p.brand?.name) attributes.brand = String(p.brand.name);
          if (p.color) attributes.color = String(p.color);
          if (p.material) attributes.material = String(p.material);
          if (p.size) attributes.size = String(p.size);
        }
      }
    } catch {
      /* ignore */
    }
  });

  return {
    sourceUrl: url,
    finalUrl: fetched.finalUrl,
    title: title?.slice(0, 300),
    description: description?.slice(0, 4000),
    price,
    images,
    attributes,
    rawText: fetched.text?.slice(0, 20_000),
    rawMarkdown: fetched.markdown?.slice(0, 20_000),
    scrapedVia: fetched.via,
  };
}

/**
 * Pick the URL with the most usable signal from the CSV row.
 * Priority: Amazon > AliExpress > Alibaba > 1688 > Other.
 * Amazon's English product pages give the cleanest HTML; 1688 is Chinese + JS-heavy.
 */
export function pickPrimarySupplier(row: {
  amazon?: string;
  aliexpress?: string;
  alibaba?: string;
  alibaba1688?: string;
  other?: string;
}): string | undefined {
  return row.amazon || row.aliexpress || row.alibaba || row.alibaba1688 || row.other || undefined;
}

export async function scrapeBest(row: {
  amazon?: string;
  aliexpress?: string;
  alibaba?: string;
  alibaba1688?: string;
  other?: string;
}): Promise<ScrapedProduct | null> {
  const candidates = [row.amazon, row.aliexpress, row.alibaba, row.alibaba1688, row.other].filter(
    (u): u is string => !!u && /^https?:\/\//.test(u),
  );
  for (const url of candidates) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20_000);
      const out = await scrapeUrl(url, controller.signal);
      clearTimeout(timer);
      if (out.title || out.description) return out;
    } catch {
      // try next
    }
  }
  return null;
}
