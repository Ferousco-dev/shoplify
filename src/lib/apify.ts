/**
 * Apify-backed HTML fetcher.
 *
 * Many supplier sites (1688, AliExpress, parts of Alibaba) are JS-rendered or
 * aggressively anti-bot — a plain `fetch()` returns either an empty shell or
 * a captcha page. Apify's website-content-crawler actor uses headless Chrome
 * and proxies, so it gets us the real rendered HTML.
 *
 * We use the synchronous run endpoint so the call returns within the request
 * lifetime (≈30-90s for product pages). The caller still passes the result
 * through the existing cheerio parser in `scrape.ts` to extract structured
 * data — Apify gives us better HTML, not a better parse.
 */

const APIFY_BASE = "https://api.apify.com/v2";
const ACTOR = "apify~website-content-crawler";
// 90s is enough for most product pages on a warm actor; Vercel Pro routes
// have 300s headroom so we never starve here.
const TIMEOUT_MS = 90_000;

type CrawlerItem = {
  url?: string;
  loadedUrl?: string;
  html?: string;
  text?: string;
  markdown?: string;
  metadata?: {
    title?: string;
    description?: string;
    canonicalUrl?: string;
    languageCode?: string;
    [k: string]: unknown;
  };
};

export type ApifyFetchResult = {
  url: string;
  finalUrl: string;
  html: string;
  text?: string;
  markdown?: string;
  metadata?: CrawlerItem["metadata"];
};

export function apifyEnabled(): boolean {
  return !!process.env.APIFY_TOKEN;
}

/**
 * Fetch a single URL via the Apify website-content-crawler actor. Returns the
 * rendered HTML plus extracted text/markdown. Throws on any failure — the
 * caller is expected to fall back to a direct cheerio scrape.
 */
export async function fetchViaApify(url: string): Promise<ApifyFetchResult> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN not set");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(
      `${APIFY_BASE}/acts/${ACTOR}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          startUrls: [{ url }],
          maxCrawlPages: 1,
          maxCrawlDepth: 0,
          // Use Playwright Chromium so JS-rendered supplier pages load fully.
          crawlerType: "playwright:chromium",
          saveHtml: true,
          saveMarkdown: true,
          // Apify's defaults are reasonable; only override what we care about.
          maxResults: 1,
          requestTimeoutSecs: 60,
        }),
      },
    );
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Apify HTTP ${res.status}: ${txt.slice(0, 300)}`);
    }
    const items = (await res.json()) as CrawlerItem[];
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Apify returned empty dataset");
    }
    const item = items[0];
    if (!item.html) throw new Error("Apify returned no HTML");
    return {
      url,
      finalUrl: item.loadedUrl || item.url || url,
      html: item.html,
      text: item.text,
      markdown: item.markdown,
      metadata: item.metadata,
    };
  } finally {
    clearTimeout(timer);
  }
}
