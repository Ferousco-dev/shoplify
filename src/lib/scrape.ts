import * as cheerio from "cheerio";

export type ScrapedProduct = {
  sourceUrl: string;
  title?: string;
  description?: string;
  price?: string;
  images: string[];
  attributes: Record<string, string>;
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

/**
 * Single-shot fetch + cheerio parse. Works on most product pages with public HTML.
 * For JS-heavy pages (1688/AliExpress are partly JS-rendered) this gets a minimum
 * usable signal: title, meta description, og:image, first product image. Enough
 * for Claude to write copy from.
 */
export async function scrapeUrl(url: string, signal?: AbortSignal): Promise<ScrapedProduct> {
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
  const html = await res.text();
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
    title: title?.slice(0, 300),
    description: description?.slice(0, 4000),
    price,
    images,
    attributes,
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
