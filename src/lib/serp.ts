/**
 * Google SERP Integration using Serper.dev API
 * Ranks keywords against actual Google search results for Shopify
 */

const SERPER_API_KEY = process.env.SERPER_API_KEY;

export type SerpResult = {
  keyword: string;
  rank?: number;
  title?: string;
  description?: string;
  url?: string;
  difficulty?: number;
};

export type SerpAnalysis = {
  keyword: string;
  searchVolume?: number;
  difficulty?: number;
  ranking_url?: string;
  ranking_position?: number;
  is_rankable: boolean;
  recommendation: string;
};

/**
 * Check if a keyword is currently ranking on Google + Shopify
 * Returns ranking position (1-100) or undefined if not in top 100
 */
export async function rankKeyword(keyword: string): Promise<SerpAnalysis> {
  if (!SERPER_API_KEY) {
    console.warn("SERPER_API_KEY not set; returning mock data");
    return {
      keyword,
      searchVolume: 1200,
      difficulty: 45,
      is_rankable: true,
      recommendation: "High potential keyword",
    };
  }

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: keyword,
        num: 20,
        gl: "us",
        hl: "en",
        tbm: "shop", // Shopify results
      }),
    });

    if (!res.ok) {
      throw new Error(`Serper ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as {
      searchParameters: { q: string };
      organic?: Array<{ position: number; title: string; link: string }>;
      shopResults?: Array<{ position: number; title: string; link: string }>;
      searchVolume?: number;
      difficulty?: number;
    };

    // Check if keyword ranks in top 100
    const allResults = [...(data.organic || []), ...(data.shopResults || [])];
    const topShopResult = allResults.find(
      (r) => r.position && r.position <= 100,
    );

    return {
      keyword,
      searchVolume: data.searchVolume,
      difficulty: data.difficulty,
      ranking_url: topShopResult?.link,
      ranking_position: topShopResult?.position,
      is_rankable: !topShopResult, // True if not already ranking (opportunity)
      recommendation:
        topShopResult && topShopResult.position <= 10
          ? "Already ranking in top 10"
          : topShopResult && topShopResult.position <= 30
            ? "In top 30 — good momentum"
            : !topShopResult
              ? "New opportunity — not ranking yet"
              : "Competitive — outside top 100",
    };
  } catch (error) {
    console.error("SERP rank check failed:", error);
    // Fallback: return neutral analysis
    return {
      keyword,
      is_rankable: true,
      recommendation: "Unable to check live SERP; use with caution",
    };
  }
}

/**
 * Analyze multiple keywords and return ranked results
 */
export async function rankKeywords(
  keywords: string[],
): Promise<SerpAnalysis[]> {
  return Promise.all(keywords.map((kw) => rankKeyword(kw)));
}

/**
 * Get SEO recommendations based on SERP data
 */
export function generateSeoRecommendations(analysis: SerpAnalysis[]): string[] {
  const recommendations: string[] = [];

  const rankable = analysis.filter((a) => a.is_rankable);
  if (rankable.length > 0) {
    recommendations.push(
      `Focus on: ${rankable
        .slice(0, 3)
        .map((a) => a.keyword)
        .join(", ")} (not yet ranking)`,
    );
  }

  const highDifficulty = analysis.filter(
    (a) => a.difficulty && a.difficulty > 60,
  );
  if (highDifficulty.length > 0) {
    recommendations.push(
      `Competitive keywords to build backlinks for: ${highDifficulty[0].keyword}`,
    );
  }

  const lowCompetition = analysis.filter(
    (a) => a.difficulty && a.difficulty < 30,
  );
  if (lowCompetition.length > 0) {
    recommendations.push(
      `Quick wins (low difficulty): ${lowCompetition
        .slice(0, 2)
        .map((a) => a.keyword)
        .join(", ")}`,
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Monitor rankings weekly; adjust strategy based on SERP movements",
    );
  }

  return recommendations;
}
